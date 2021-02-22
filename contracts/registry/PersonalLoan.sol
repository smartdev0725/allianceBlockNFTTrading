// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LoanDetails.sol";
import "../libs/TokenFormat.sol";

/**
 * @title AllianceBlock PersonalLoan contract
 * @notice Functionality for Personal Loan.
 */
contract PersonalLoan is LoanDetails {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    function requestPersonalLoan(
        uint256 amountRequested,
        address collateralToken,
        uint256 collateralAmount,
        uint256 totalAmountOfBatches,
        uint256 interestPercentage,
        uint256 batchTimeInterval,
        string extraInfo,
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

        escrow.transferLendingToken(loanBorrower[loanId_], loanDetails[loanId_].lendingAmount);
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

    function _executePersonalLoanPayment(
        uint256 loanId_
    )
    internal
    onlyBetweenBatchTimeframe(loanId_)
    onlyActiveLoan(loanId_)
    {
        //if interest + nominal
        if(personalLoanPayments[loanId_].repaymentBatchType == LoanLibrary.RepaymentBatchType.INTEREST_PLUS_NOMINAL) {
            _transferPersonalLoanPayment(loanId_, personalLoanPayments[loanId_].amountEachBatch);
        } else { //if interest only
            _executePersonalLoanInterestOnlyPayment(loanId_);
        }
    }

    function _executePersonalLoanInterestOnlyPayment(
        uint256 loanId_
    )
    internal
    {
        uint256 amount;
        //if last batch
        if (personalLoanPayments[loanId_].batchesPaid.add(1) == personalLoanPayments[loanId_].totalAmountOfBatches) {
            amount = personalLoanPayments[loanId_].amountEachBatch.add(loanDetails[loanId_].lendingAmount);
        } else { //any other batch
            amount = personalLoanPayments[loanId_].amountEachBatch;
        }
        _transferPersonalLoanPayment(loanId_, amount);
    }

    function _transferPersonalLoanPayment(
        uint256 loanId_,
        uint256 amount
    )
    internal
    {
        IERC20(lendingToken).transferFrom(msg.sender, address(escrow), amount);

        personalLoanPayments[loanId_].batchesPaid = personalLoanPayments[loanId_].batchesPaid.add(1);

        if(personalLoanPayments[loanId_].batchesPaid == personalLoanPayments[loanId_].totalAmountOfBatches) {
            loanStatus[loanId_] = LoanLibrary.LoanStatus.SETTLED;
        } else {
            personalLoanPayments[loanId_].batchStartingTimestamp = personalLoanPayments[loanId_].batchDeadlineTimestamp;
            personalLoanPayments[loanId_].batchDeadlineTimestamp = personalLoanPayments[loanId_].batchStartingTimestamp.add(
                personalLoanPayments[loanId_].timeIntervalBetweenBatches);
        }
    }

    function _receivePersonalLoanPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_
    )
    internal
    onlySettledLoan(loanId_)
    {
        uint256 batchesToBePaid = generation_.sub(personalLoanPayments[loanId_].batchesPaid);
        require(batchesToBePaid > 0, "Not eligible for payment");

        uint256 amountToBePaid = personalLoanPayments[loanId_].amountEachBatch.mul(
            amountOfTokens_).mul(batchesToBePaid).div(loanDetails[loanId_].totalPartitions);

        if(loanStatus[loanId_] == LoanLibrary.LoanStatus.SETTLED) {
            if(personalLoanPayments[loanId_].repaymentBatchType == LoanLibrary.RepaymentBatchType.ONLY_INTEREST) {
                amountToBePaid = amountToBePaid.add(loanDetails[loanId_].lendingAmount.mul(
                    amountOfTokens_).div(loanDetails[loanId_].totalPartitions));
            }

            loanNFT.burn(msg.sender, generation_.getTokenId(loanId_), amountOfTokens_);
        } else {
            loanNFT.increaseGenerations(generation_.getTokenId(loanId_), msg.sender, amountOfTokens_, batchesToBePaid);
        }
        
        escrow.transferLendingToken(msg.sender, amountToBePaid);
    }
}
