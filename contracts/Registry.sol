// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./PersonalLoan.sol";
import "./ProjectLoan.sol";

/**
 * @title AllianceBlock Registry contract
 * @notice Responsible for loan transactions.
 */
contract Registry is PersonalLoan, ProjectLoan, Ownable {
    using SafeMath for uint256;
    /**
     * @dev Constructor of the contract.
     */
    constructor(
        uint256 baseAmountForEachPartition_,
        address governanceAddress_,
        address lendingToken_,
        uint256 minimumInterestPercentage_,
        address mainNFT_,
        address loanNFT_,
        uint256 maxMilestones_,
        uint256 milestoneExtensionInterval_,
        uint256 vestingBatches_,
        uint256 vestingTimeInterval_
    )
    public
    {
        // TODO - Initialize escrow
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

    function decideForLoan(
        uint256 loanId,
        bool decision
    )
    external
    onlyGovernance()
    {
        if(decision) _approveLoan(loanId);
        else _rejectLoan(loanId);
    }

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

        // TODO - All funds transfered to escrow.
        IERC20(lendingToken).transferFrom(msg.sender, address(this), partitionsToPurchase.mul(baseAmountForEachPartition));
        loanNFT.safeTransferFrom(address(this), msg.sender, loanId, partitionsToPurchase, "");

        loanDetails[loanId].partitionsPurchased = loanDetails[loanId].partitionsPurchased.add(partitionsToPurchase);

        if(loanDetails[loanId].partitionsPurchased == loanDetails[loanId].totalPartitions) {
            _startLoan(loanId);
        }
    }

    function executePayment(
        uint256 loanId
    )
    external
    onlyBorrower(loanId)
    onlyActiveLoan(loanId)
    {
        // TODO - EXECUTE PAYMENTS BY PROJECT OR PERSON (BORROWER)
    }

    function receivePayment(
        uint256 loanId,
        bool isProjectTokens
    )
    external
    onlyBorrower(loanId)
    onlyActiveLoan(loanId)
    {
        // TODO - RECEIVE PAYMENT (only for ERC1155 holders)
    }

    function challengeLoan(
        uint256 loanId
    )
    external
    onlyActiveLoan(loanId)
    onlyAfterDeadlineReached(loanId)
    {
        if(loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) _challengePersonalLoan(loanId);
        else _challengeProjectLoan(loanId);
    }

    function _approveLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.APPROVED;
        loanNFT.unpauseTokenTransfer(loanId_); //UnPause trades for ERC1155s with the specific loan ID.
    }

    function _rejectLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.REJECTED;
        // TODO - Transfer to escrow
        IERC20(loanDetails[loanId_].collateralToken).transfer(loanBorrower[loanId_], loanDetails[loanId_].collateralAmount);
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
    }
}
