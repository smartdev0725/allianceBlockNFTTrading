// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LoanDetails.sol";

/**
 * @title AllianceBlock ProjectLoan contract
 * @notice Functionality for Project Loan.
 */
contract ProjectLoan is LoanDetails {
    using SafeMath for uint256;    

    function requestProjectLoan(
        uint256[] calldata amountRequestedPerMilestone,
        address collateralToken,
        uint256 collateralAmount,
        uint256 interestPercentage,
        uint256 totalMilestones,
        uint256[] calldata milestoneDurations,
        uint256 timeDiffBetweenDeliveryAndRepayment,
        bytes32 extraInfo
    )
    external
    onlyAcceptedNumberOfMilestones(totalMilestones)
    {
        uint256 totalAmountRequested;

        for(uint256 i = 0; i < totalMilestones; i++) {
            projectLoanPayments[totalLoans].milestoneLendingAmount[i] = amountRequestedPerMilestone[i];
            projectLoanPayments[totalLoans].milestoneDuration[i] = milestoneDurations[i];

            totalAmountRequested = totalAmountRequested.add(amountRequestedPerMilestone[i]);
        }

        _storeLoanDetails(
            totalAmountRequested,
            collateralToken,
            collateralAmount,
            interestPercentage,
            extraInfo
        );

        _storeProjectLoanPayments(
            totalMilestones,
            timeDiffBetweenDeliveryAndRepayment
        );

        loanDetails[totalLoans].loanType = LoanLibrary.LoanType.PROJECT;

        governance.requestApproval(totalLoans, false, 0);

        totalLoans = totalLoans.add(1);
    }

    function applyMilestone(
        uint256 loanId
    )
    external    
    onlyBorrower(loanId)
    onlyActiveLoan(loanId)
    onlyProjectLoan(loanId)
    onlyBetweenMilestoneTimeframe(loanId)
    {
        loanStatus[loanId] == LoanLibrary.LoanStatus.AWAITING_MILESTONE_APPROVAL;
        governance.requestApproval(totalLoans, true, projectLoanPayments[loanId].milestonesDelivered);
    }

    function decideForMilestone(
        uint256 loanId,
        bool decision
    )
    external
    onlyGovernance()
    onlyWhenAwaitingMilestoneApproval(loanId)
    onlyProjectLoan(loanId)
    {
        if(decision) _approveMilestone(loanId);
        else _rejectMilestone(loanId);
    }

    function _approveMilestone(
        uint256 loanId_
    )
    internal
    {
        projectLoanPayments[loanId_].milestonesDelivered = projectLoanPayments[loanId_].milestonesDelivered.add(1);

        if(projectLoanPayments[loanId_].milestonesDelivered == projectLoanPayments[loanId_].totalMilestones) {
            loanStatus[loanId_] = LoanLibrary.LoanStatus.AWAITING_REPAYMENT;
            projectLoanPayments[loanId_].currentMilestoneStartingTimestamp = block.timestamp;
            projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp = block.timestamp.add(
                projectLoanPayments[loanId_].timeDiffBetweenDeliveryAndRepayment);
        } else {
            escrow.transferLendingToken(
                loanBorrower[loanId_],
                projectLoanPayments[loanId_].milestoneLendingAmount[projectLoanPayments[loanId_].milestonesDelivered]
            );
            projectLoanPayments[loanId_].currentMilestoneStartingTimestamp = block.timestamp;
            projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp = block.timestamp.add(
                projectLoanPayments[loanId_].milestoneDuration[projectLoanPayments[loanId_].milestonesDelivered]);
        }
    }

    function _rejectMilestone(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] == LoanLibrary.LoanStatus.STARTED;
        if(projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp <= block.timestamp) {
            _challengeProjectLoan(loanId_);
        }
    }

    function _storeProjectLoanPayments(
        uint256 totalMilestones_,
        uint256 timeDiffBetweenDeliveryAndRepayment_
    )
    internal
    {        
        projectLoanPayments[totalLoans].amountToBeRepaid = loanDetails[totalLoans].totalInterest.add(
            loanDetails[totalLoans].lendingAmount);

        projectLoanPayments[totalLoans].totalMilestones = totalMilestones_;
        projectLoanPayments[totalLoans].timeDiffBetweenDeliveryAndRepayment = timeDiffBetweenDeliveryAndRepayment_;
    }

    function _startProjectLoan(
        uint256 loanId_
    )
    internal
    {        
        projectLoanPayments[loanId_].currentMilestoneStartingTimestamp = block.timestamp;
        projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp = block.timestamp.add(
            projectLoanPayments[loanId_].milestoneDuration[0]);

        escrow.transferLendingToken(loanBorrower[loanId_], projectLoanPayments[loanId_].milestoneLendingAmount[0]);
    }

    function _challengeProjectLoan(
        uint256 loanId_
    )
    internal
    {
        projectLoanPayments[loanId_].milestonesExtended = projectLoanPayments[loanId_].milestonesExtended.add(1);

        if(projectLoanPayments[loanId_].milestonesExtended > 1) {
            loanStatus[loanId_] == LoanLibrary.LoanStatus.DEFAULT;
            // TODO - SPECIFY DEFAULT
        } else {
            projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp =
                projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp.add(milestoneExtensionInterval);
        }
    }

    function _executeProjectLoanPayment(
        uint256 loanId_
    )
    internal
    onlyBetweenMilestoneTimeframe(loanId_)
    onlyOnProjectRepayment(loanId_)
    {        
        IERC20(lendingToken).transferFrom(msg.sender, address(this), projectLoanPayments[loanId_].amountToBeRepaid);
    }
}
