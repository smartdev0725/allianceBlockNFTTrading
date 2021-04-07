// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./registry/PersonalLoan.sol";
import "./registry/ProjectLoan.sol";
import "./libs/TokenFormat.sol";

/**
 * @title AllianceBlock Registry contract
 * @notice Responsible for loan transactions.
 */
contract Registry is PersonalLoan, ProjectLoan, Ownable {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // Events
    event LoanDecisionMade(uint indexed loanId, bool decision);
    event LoanPartitionsPurchased(uint indexed loanId, uint256 partitionsToPurchase);
    event LoanStarted(uint indexed loanId);
    event LoanApproved(uint indexed loanId);
    event LoanRejected(uint indexed loanId);
    event LoanChallenged(uint indexed loanId);
    event PaymentReceived(uint indexed loanId, uint256 amountOfTokens, uint256 generation);
    event PaymentExecuted(uint indexed loanId);

    /**
     * @dev Constructor of the contract.
     */
    constructor(
        address escrowAddress,
        address governanceAddress_,
        address lendingToken_,
        address mainNFT_,
        address loanNFT_,
        uint256 baseAmountForEachPartition_,
        uint256 minimumInterestPercentage_,
        uint256 maxMilestones_,
        uint256 milestoneExtensionInterval_,
        uint256 vestingBatches_,
        uint256 vestingTimeInterval_
    )
    {
        escrow = IEscrow(escrowAddress);
        baseAmountForEachPartition = baseAmountForEachPartition_;
        governance = IGovernance(governanceAddress_);
        lendingToken = IERC20(lendingToken_);
        minimumInterestPercentage = minimumInterestPercentage_;
        mainNFT = IERC721Mint(mainNFT_);
        loanNFT = IERC1155Mint(loanNFT_);
        maxMilestones = maxMilestones_;
        milestoneExtensionInterval = milestoneExtensionInterval_;
        vestingBatches = vestingBatches_;
        vestingTimeInterval = vestingTimeInterval_;
    }

    /**
     * @dev This function is called by governance to approve or reject a loan request.
     * @param loanId The id of the loan.
     * @param decision The decision of the governance. [true -> approved] [false -> rejected]
     */
    function decideForLoan(
        uint256 loanId,
        bool decision
    )
    external
    onlyGovernance()
    {
        if(decision) _approveLoan(loanId);
        else _rejectLoan(loanId);
        emit LoanDecisionMade(loanId, decision);
    }

    /**
     * @dev This function is called by the lenders to fund a loan.
     * @param loanId The id of the loan.
     * @param partitionsToPurchase The amount of ERC1155 tokens (which represent partitions of the loan) to be purchased.
     */
    function fundLoan(
        uint256 loanId,
        uint256 partitionsToPurchase
    )
    external
    onlyActivelyFundedLoan(loanId)
    {
        require(partitionsToPurchase <= loanDetails[loanId].totalPartitions.sub(loanDetails[loanId].partitionsPurchased),
            "Not enough partitions left for purchase");

        if(loanStatus[loanId] == LoanLibrary.LoanStatus.APPROVED) {
            loanStatus[loanId] = LoanLibrary.LoanStatus.FUNDING;
        }

        IERC20(lendingToken).transferFrom(msg.sender, address(escrow), partitionsToPurchase.mul(baseAmountForEachPartition));
        escrow.transferLoanNFT(loanId, partitionsToPurchase, msg.sender);

        loanDetails[loanId].partitionsPurchased = loanDetails[loanId].partitionsPurchased.add(partitionsToPurchase);

        emit LoanPartitionsPurchased(loanId, partitionsToPurchase);
        if(loanDetails[loanId].partitionsPurchased == loanDetails[loanId].totalPartitions) {
            _startLoan(loanId);
        }
    }

    /**
     * @dev This function is called by the borrower to return part of or whole owed amount for a loan (depending on agreement).
     * @param loanId The id of the loan.
     */
    function executePayment(
        uint256 loanId
    )
    external
    onlyBorrower(loanId)
    {
        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) {
            _executePersonalLoanPayment(loanId);
        } else {
            _executeProjectLoanPayment(loanId);
        }
        emit PaymentExecuted(loanId);
    }

    /**
     * @dev This function is called by ERC1155 holders to receive a payment (after borrower has repaid part of loan).
     * @param tokenId The token id of the ERC1155 tokens, which is eligible for the payment.
     * @param amountOfTokens The amount of tokens to receive payment for.
     * @param onProjectTokens Only used in project loans. [true -> repayment in collateral token] [false -> repayment in lending token]
     */
    function receivePayment(
        uint256 tokenId,
        uint256 amountOfTokens,
        bool onProjectTokens
    )
    external
    onlyEnoughERC1155Balance(tokenId, amountOfTokens)
    {
        (uint256 loanId, uint256 generation) = tokenId.formatTokenId();
        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) {
            _receivePersonalLoanPayment(loanId, generation, amountOfTokens);
        } else {
            _receiveProjectLoanPayment(loanId, amountOfTokens, onProjectTokens);
        }
        emit PaymentReceived(loanId, amountOfTokens, generation);
    }

    /**
     * @dev Through this function any address can challenge a loan in case of rules breaking by the borrower.
            If challenging succeeds it can end up to either small penalty or whole collateral loss.
     * @param loanId The id of the loan.
     */
    function challengeLoan(
        uint256 loanId
    )
    external
    onlyActiveLoan(loanId)
    onlyAfterDeadlineReached(loanId)
    {
        if(loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) _challengePersonalLoan(loanId);
        else _challengeProjectLoan(loanId);
        emit LoanChallenged(loanId);
    }

    function _approveLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.APPROVED;
        loanNFT.unpauseTokenTransfer(loanId_); //UnPause trades for ERC1155s with the specific loan ID.
        emit LoanApproved(loanId_);
    }

    function _rejectLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.REJECTED;
        escrow.transferCollateralToken(loanDetails[loanId_].collateralToken, loanBorrower[loanId_], loanDetails[loanId_].collateralAmount);
        emit LoanRejected(loanId_);
    }

    function _startLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.STARTED;
        loanDetails[loanId_].startingDate = block.timestamp;

        if(loanDetails[loanId_].loanType == LoanLibrary.LoanType.PERSONAL) _startPersonalLoan(loanId_);
        else _startProjectLoan(loanId_);
        emit LoanStarted(loanId_);
    }
}
