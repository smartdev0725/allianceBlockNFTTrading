// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "./registry/PersonalLoan.sol";
import "./registry/ProjectLoan.sol";
import "./libs/TokenFormat.sol";

/**
 * @title AllianceBlock Registry contract
 * @notice Responsible for loan transactions.
 */
contract Registry is Initializable, PersonalLoan, ProjectLoan {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // Events
    event LoanPartitionsPurchased(
        uint256 indexed loanId,
        uint256 partitionsToPurchase,
        address lender
    );
    event LoanStarted(
        uint256 indexed loanId,
        LoanLibrary.LoanType indexed loanType
    );
    event LoanApproved(
        uint256 indexed loanId,
        LoanLibrary.LoanType indexed loanType
    );
    event LoanRejected(
        uint256 indexed loanId,
        LoanLibrary.LoanType indexed loanType
    );
    event LoanChallenged(
        uint256 indexed loanId,
        LoanLibrary.LoanType indexed loanType,
        address user
    );
    event PaymentReceived(
        uint256 indexed loanId,
        uint256 amountOfTokens,
        uint256 indexed generation,
        bool indexed onProjectTokens,
        address user
    );
    event PaymentExecuted(
        uint256 indexed loanId,
        LoanLibrary.LoanType indexed loanType,
        address indexed seeker
    );

    /**
     * @dev Initialize of the contract.
     */
    function initialize(
        address escrowAddress,
        address governanceAddress_,
        address lendingToken_,
        address mainNFT_,
        address fundingNFT_,
        uint256 baseAmountForEachPartition_,
        uint256 minimumInterestPercentage_,
        uint256 maxMilestones_,
        uint256 milestoneExtensionInterval_,
        uint256 vestingBatches_,
        uint256 vestingTimeInterval_,
        uint256 fundingTimeInterval_
    ) public initializer {
        escrow = IEscrow(escrowAddress);
        baseAmountForEachPartition = baseAmountForEachPartition_;
        governance = IGovernance(governanceAddress_);
        lendingToken = IERC20(lendingToken_);
        minimumInterestPercentage = minimumInterestPercentage_;
        mainNFT = IERC721Mint(mainNFT_);
        fundingNFT = IERC1155Mint(fundingNFT_);
        maxMilestones = maxMilestones_;
        milestoneExtensionInterval = milestoneExtensionInterval_;
        vestingBatches = vestingBatches_;
        vestingTimeInterval = vestingTimeInterval_;
        fundingTimeInterval = fundingTimeInterval_;
    }

    /**
     * @dev This function is called by governance to approve or reject a loan request.
     * @param loanId The id of the loan.
     * @param decision The decision of the governance. [true -> approved] [false -> rejected]
     */
    function decideForLoan(uint256 loanId, bool decision)
        external
        onlyGovernance()
    {
        if (decision) _approveLoan(loanId);
        else _rejectLoan(loanId);
    }

    /**
     * @dev This function is called by the lenders to fund a loan.
     * @param loanId The id of the loan.
     * @param partitionsToPurchase The amount of ERC1155 tokens (which represent partitions of the loan) to be purchased.
     */
    function fundLoan(uint256 loanId, uint256 partitionsToPurchase)
        external
        onlyActivelyFundedLoan(loanId)
    {
        require(
            partitionsToPurchase <=
                loanDetails[loanId].totalPartitions.sub(
                    loanDetails[loanId].partitionsPurchased
                ),
            "Not enough partitions left for purchase"
        );

        if (loanStatus[loanId] == LoanLibrary.LoanStatus.APPROVED) {
            loanStatus[loanId] = LoanLibrary.LoanStatus.FUNDING;
        }

        IERC20(lendingToken).transferFrom(
            msg.sender,
            address(escrow),
            partitionsToPurchase.mul(baseAmountForEachPartition)
        );

        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) {
            escrow.transferFundingNFT(loanId, partitionsToPurchase, msg.sender);
        } else {
            _transferFundingNFTToProjectFunder(
                loanId,
                partitionsToPurchase,
                msg.sender
            );
        }

        loanDetails[loanId].partitionsPurchased = loanDetails[loanId]
            .partitionsPurchased
            .add(partitionsToPurchase);

        emit LoanPartitionsPurchased(loanId, partitionsToPurchase, msg.sender);
        if (
            loanDetails[loanId].partitionsPurchased ==
            loanDetails[loanId].totalPartitions
        ) {
            _startLoan(loanId);
        }
    }

    /**
     * @dev This function is called by the seeker to return part of or whole owed amount for a loan (depending on agreement).
     * @param loanId The id of the loan.
     */
    function executePayment(uint256 loanId) external onlySeeker(loanId) {
        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) {
            _executePersonalLoanPayment(loanId);
        } else {
            _executeProjectLoanPayment(loanId);
        }
        emit PaymentExecuted(loanId, loanDetails[loanId].loanType, msg.sender);
    }

    /**
     * @dev This function is called by ERC1155 holders to receive a payment (after seeker has repaid part of loan).
     * @param tokenId The token id of the ERC1155 tokens, which is eligible for the payment.
     * @param amountOfTokens The amount of NFT tokens to receive payment for.
     * @param onProjectTokens Only used in project loans. [true -> repayment in project token] [false -> repayment in lending token]
     */
    function receivePayment(
        uint256 tokenId,
        uint256 amountOfTokens,
        bool onProjectTokens
    ) external onlyEnoughERC1155Balance(tokenId, amountOfTokens) {
        (uint256 generation, uint256 loanId) = tokenId.formatTokenId();
        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) {
            _receivePersonalLoanPayment(loanId, generation, amountOfTokens);
        } else {
            _receiveProjectLoanPayment(
                loanId,
                generation,
                amountOfTokens,
                onProjectTokens
            );
        }
        emit PaymentReceived(
            loanId,
            amountOfTokens,
            generation,
            onProjectTokens,
            msg.sender
        );
    }

    /**
     * @dev Through this function any address can challenge a loan in case of rules breaking by the seeker.
            If challenging succeeds it can end up to either small penalty or whole collateral loss.
     * @param loanId The id of the loan.
     */
    function challengeLoan(uint256 loanId)
        external
        onlyActiveLoan(loanId)
        onlyAfterDeadlineReached(loanId)
    {
        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL)
            _challengePersonalLoan(loanId);
        else _challengeProjectLoan(loanId);
        emit LoanChallenged(loanId, loanDetails[loanId].loanType, msg.sender);
    }

    function _approveLoan(uint256 loanId_) internal {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.APPROVED;
        loanDetails[loanId_].approvalDate = block.timestamp;
        fundingNFT.unpauseTokenTransfer(loanId_); //UnPause trades for ERC1155s with the specific loan ID.
        emit LoanApproved(loanId_, loanDetails[loanId_].loanType);
    }

    function _rejectLoan(uint256 loanId_) internal {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.REJECTED;
        escrow.transferCollateralToken(
            loanDetails[loanId_].collateralToken,
            loanSeeker[loanId_],
            loanDetails[loanId_].collateralAmount
        );
        emit LoanRejected(loanId_, loanDetails[loanId_].loanType);
    }

    function _startLoan(uint256 loanId_) internal {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.STARTED;
        loanDetails[loanId_].startingDate = block.timestamp;

        if (loanDetails[loanId_].loanType == LoanLibrary.LoanType.PERSONAL)
            _startPersonalLoan(loanId_);
        else _startProjectLoan(loanId_);
        emit LoanStarted(loanId_, loanDetails[loanId_].loanType);
    }

    /**
     * @dev This helper function provides a single point for querying the Loan metadata
     * @param loanId The id of the loan.
     */
    function getLoanMetadata(uint256 loanId)
        public
        view
        returns (
            LoanLibrary.LoanDetails memory, // the loanDetails
            LoanLibrary.LoanStatus, // the loanStatus
            address, // the loanSeeker,
            LoanLibrary.RepaymentBatchType // the repaymentBatchType
        )
    {
        return (
            loanDetails[loanId],
            loanStatus[loanId],
            loanSeeker[loanId],
            personalLoanPayments[loanId].repaymentBatchType
        );
    }
}
