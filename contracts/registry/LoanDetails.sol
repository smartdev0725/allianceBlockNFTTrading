// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Storage.sol";
import "../libs/TokenFormat.sol";

/**
 * @title AllianceBlock LoanDetails contract
 * @notice Functionality for storing loan details and modifiers.
 */
contract LoanDetails is Storage {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    modifier onlyGovernance() {
        require(msg.sender == address(governance), "Only Governance");
        _;
    }

    modifier onlySeeker(uint256 loanId) {
        require(
            msg.sender == loanSeeker[loanId],
            "Only seeker of the loan"
        );
        _;
    }

    modifier onlyActivelyFundedLoan(uint256 loanId) {
        require(
            loanStatus[loanId] == LoanLibrary.LoanStatus.APPROVED ||
                loanStatus[loanId] == LoanLibrary.LoanStatus.FUNDING,
            "Only when loan is actively getting funded"
        );
        require(
            loanDetails[loanId].approvalDate.add(fundingTimeInterval) >
                block.timestamp,
            "Only between funding timeframe"
        );
        _;
    }

    modifier onlyActiveLoan(uint256 loanId) {
        require(
            loanStatus[loanId] == LoanLibrary.LoanStatus.STARTED ||
                loanStatus[loanId] ==
                LoanLibrary.LoanStatus.AWAITING_MILESTONE_APPLICATION,
            "Only when loan is active"
        );
        _;
    }

    modifier onlyOnProjectRepayment(uint256 loanId) {
        require(
            loanStatus[loanId] == LoanLibrary.LoanStatus.AWAITING_REPAYMENT,
            "Only on Repayment Status"
        );
        require(
            projectLoanPayments[loanId].awaitingForRepaymentDate.add(
                projectLoanPayments[loanId].paymentTimeInterval
            ) > block.timestamp,
            "Only between awaiting for repayment timeframe"
        );
        _;
    }

    modifier onlySettledLoan(uint256 loanId) {
        require(
            loanStatus[loanId] == LoanLibrary.LoanStatus.SETTLED,
            "Only on Settled Status"
        );
        _;
    }

    modifier onlyBetweenMilestoneTimeframe(uint256 loanId) {
        require(
            projectLoanPayments[loanId].currentMilestoneDeadlineTimestamp >
                block.timestamp &&
                projectLoanPayments[loanId].currentMilestoneStartingTimestamp <=
                block.timestamp,
            "Only between milestone's timeframe"
        );
        _;
    }

    modifier onlyBetweenBatchTimeframe(uint256 loanId) {
        require(
            personalLoanPayments[loanId].batchDeadlineTimestamp >
                block.timestamp &&
                personalLoanPayments[loanId].batchStartingTimestamp <=
                block.timestamp,
            "Only between batch timeframe"
        );
        _;
    }

    modifier onlyAfterDeadlineReached(uint256 loanId) {
        if (loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL) {
            require(
                personalLoanPayments[loanId].batchDeadlineTimestamp <=
                    block.timestamp,
                "Only after batch deadline is reached"
            );
        } else {
            require(
                projectLoanPayments[loanId].currentMilestoneDeadlineTimestamp <=
                    block.timestamp,
                "Only after milestone deadline is reached"
            );
        }
        _;
    }

    modifier onlyPersonalLoan(uint256 loanId) {
        require(
            loanDetails[loanId].loanType == LoanLibrary.LoanType.PERSONAL,
            "Only when loan is personal"
        );
        _;
    }

    modifier onlyProjectLoan(uint256 loanId) {
        require(
            loanDetails[loanId].loanType == LoanLibrary.LoanType.PROJECT,
            "Only when loan is for project"
        );
        _;
    }

    modifier onlyAcceptedNumberOfMilestones(uint256 totalMilestones) {
        require(
            totalMilestones <= maxMilestones,
            "Only accepted number of milestones"
        );
        _;
    }

    modifier onlyWhenAwaitingMilestoneApproval(uint256 loanId) {
        require(
            loanStatus[loanId] ==
                LoanLibrary.LoanStatus.AWAITING_MILESTONE_APPROVAL,
            "Only when loan is awaiting for milestone approval"
        );
        _;
    }

    modifier onlyEnoughERC1155Balance(uint256 loanId, uint256 amountOfTokens) {
        uint256 balance;
        for (
            uint256 i = 0;
            i < projectLoanPayments[loanId].totalMilestones;
            i++
        ) {
            balance = balance.add(
                fundingNFT.balanceOf(msg.sender, i.getTokenId(loanId))
            );
        }
        require(balance >= amountOfTokens, "Only when enough balance");
        _;
    }

    function _storeLoanDetails(
        LoanLibrary.LoanType loanType_,
        uint256 lendingAmountRequested_,
        address collateralToken_,
        uint256 collateralAmount_,
        uint256 interestPercentage_,
        string memory extraInfo_
    ) internal {
        require(
            interestPercentage_ >= minimumInterestPercentage,
            "Interest percentage lower than limit"
        );

        LoanLibrary.LoanDetails memory loan;
        loan.loanId = totalLoans;
        loan.loanType = loanType_;
        loan.collateralToken = collateralToken_;
        loan.collateralAmount = collateralAmount_;
        loan.lendingAmount = lendingAmountRequested_;
        loan.interestPercentage = interestPercentage_;
        loan.totalInterest = lendingAmountRequested_
            .mul(interestPercentage_)
            .div(100);
        loan.extraInfo = extraInfo_;
        loan.totalPartitions = lendingAmountRequested_.div(
            baseAmountForEachPartition
        );

        loanDetails[totalLoans] = loan;

        loanStatus[totalLoans] = LoanLibrary.LoanStatus.REQUESTED;
        loanSeeker[totalLoans] = msg.sender;
    }
}
