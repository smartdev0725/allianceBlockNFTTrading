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

    /**
     * @dev This function is used for potential borrowing project to request a loan.
     * @param amountRequestedPerMilestone The lending amounts project is looking to get for each milestone.
     * @param collateralToken The token that will be used by the proect as collateral.
     * @param collateralAmount The amount of tokens that will be used by the project as collateral.
     * @param interestPercentage The interest percentage that will be obtained after whole repayment.
     * @param totalMilestones The total amount of Milestones project is requesting funds for.
     * @param milestoneDurations The duration of each Milestone.
     * @param timeDiffBetweenDeliveryAndRepayment The time interval between the last milestone delivery by the project and
     *                                            the repayment of the loan by the project.
     * @param extraInfo The ipfs hash where more specific details for loan request are stored.
     */
    function requestProjectLoan(
        uint256[] calldata amountRequestedPerMilestone,
        address collateralToken,
        uint256 collateralAmount,
        uint256 interestPercentage,
        uint256 totalMilestones,
        uint256[] calldata milestoneDurations,
        uint256 timeDiffBetweenDeliveryAndRepayment,
        string memory extraInfo
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

    /**
     * @dev This function is used by the project to apply a milestone for a specific loan.
     * @param loanId The id of the loan.
     */
    function applyMilestone(
        uint256 loanId
    )
    external    
    onlyBorrower(loanId)
    onlyActiveLoan(loanId)
    onlyProjectLoan(loanId)
    onlyBetweenMilestoneTimeframe(loanId)
    {
        loanStatus[loanId] = LoanLibrary.LoanStatus.AWAITING_MILESTONE_APPROVAL;
        governance.requestApproval(loanId, true, projectLoanPayments[loanId].milestonesDelivered);
    }

    /**
     * @dev This function is called by governance to approve or reject an applied milestone's request.
     * @param loanId The id of the loan.
     * @param decision The decision of the governance. [true -> approved] [false -> rejected]
     */
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
            loanStatus[loanId_] = LoanLibrary.LoanStatus.AWAITING_MILESTONE_APPLICATION;
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
        IERC20(lendingToken).transferFrom(msg.sender, address(escrow), projectLoanPayments[loanId_].amountToBeRepaid);
    }

    function _receiveProjectLoanPayment(
        uint256 loanId_,
        uint256 amountOfTokens_,
        bool onProjectTokens_
    )
    internal
    onlySettledLoan(loanId_)
    {
        if(onProjectTokens_) {            
            // TODO - execute payment on project tokens
        } else {
            uint256 amountToBePaid = projectLoanPayments[loanId_].amountToBeRepaid.mul(
                amountOfTokens_).div(loanDetails[loanId_].totalPartitions);

            loanNFT.burn(msg.sender, loanId_, amountOfTokens_);
            escrow.transferLendingToken(msg.sender, amountToBePaid);
        }
    }

    // GETTERS
    function getMilestonesInfo(
        uint256 loanId_,
        uint256 milestone_
    )
    public
    view
    returns(uint amount, uint timestamp)
    {
        amount = projectLoanPayments[loanId_].milestoneLendingAmount[milestone_];
        timestamp = projectLoanPayments[loanId_].milestoneDuration[milestone_];
    }
}
