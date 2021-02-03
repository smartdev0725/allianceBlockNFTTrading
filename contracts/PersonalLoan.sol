// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LoanDetails.sol";

/**
 * @title AllianceBlock PersonalLoan contract
 * @notice Functionality for Personal Loan.
 */
contract PersonalLoan is LoanDetails {
    using SafeMath for uint256;

    function requestPersonalLoan(
        uint256 amountRequested,
        address collateralToken,
        uint256 collateralAmount,
        uint256 totalAmountOfBatches,
        uint256 interestPercentage,
        uint256 batchTimeInterval,
        bytes32 extraInfo,
        LoanLibrary.RepaymentBatchType repaymentBatchType
    )
    external
    {
        require(uint256(repaymentBatchType) <= 1, "Wrong repayment batch type");

        _storeLoanDetails(
            amountRequested,
            collateralToken,
            collateralAmount,
            interestPercentage,
            extraInfo
        );

        _storePersonalLoanPayments(
            totalAmountOfBatches,
            batchTimeInterval,
            repaymentBatchType
        );

        loanDetails[totalLoans].loanType = LoanLibrary.LoanType.PERSONAL;

        governance.requestApproval(totalLoans, false, 0);

        totalLoans = totalLoans.add(1);
    }

    function _storePersonalLoanPayments(
        uint256 totalAmountOfBatches_,
        uint256 batchTimeInterval_,
        LoanLibrary.RepaymentBatchType repaymentBatchType_
    )
    internal
    {
        // Calculate repayment of borrower for each batch.
        if(repaymentBatchType_ == LoanLibrary.RepaymentBatchType.ONLY_INTEREST) {
            personalLoanPayments[totalLoans].amountEachBatch = loanDetails[totalLoans].totalInterest.div(
                totalAmountOfBatches_);
        } else {
            personalLoanPayments[totalLoans].amountEachBatch = (loanDetails[totalLoans].totalInterest.add(
                loanDetails[totalLoans].lendingAmount)).div(
                totalAmountOfBatches_);
        }

        personalLoanPayments[totalLoans].totalAmountOfBatches = totalAmountOfBatches_;
        personalLoanPayments[totalLoans].timeIntervalBetweenBatches = batchTimeInterval_;
        personalLoanPayments[totalLoans].repaymentBatchType = repaymentBatchType_;
    }

    function _startPersonalLoan(
        uint256 loanId_
    )
    internal
    {        
        personalLoanPayments[loanId_].batchStartingTimestamp = block.timestamp;
        personalLoanPayments[loanId_].batchDeadlineTimestamp = block.timestamp.add(
            personalLoanPayments[loanId_].timeIntervalBetweenBatches);

        // TODO - Transfer to escrow
        lendingToken.transfer(loanBorrower[loanId_], loanDetails[loanId_].lendingAmount);
    }

    function _challengePersonalLoan(
        uint256 loanId_
    )
    internal
    {
        personalLoanPayments[loanId_].batchesSkipped = personalLoanPayments[loanId_].batchesSkipped.add(1);

        if(personalLoanPayments[loanId_].batchesSkipped > 1) {
            loanStatus[loanId_] == LoanLibrary.LoanStatus.DEFAULT;
            // TODO - SPECIFY DEFAULT
        } else {
            personalLoanPayments[loanId_].batchDeadlineTimestamp =
                personalLoanPayments[loanId_].batchDeadlineTimestamp.add(
                    personalLoanPayments[loanId_].timeIntervalBetweenBatches
                );
        }
    }
}
