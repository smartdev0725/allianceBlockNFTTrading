// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LoanDetailsV2Test.sol";
import "../../libs/TokenFormat.sol";

/**
 * @title AllianceBlock PersonalLoan contract
 * @notice Functionality for Personal Loan.
 */
contract PersonalLoanV2Test is LoanDetailsV2Test {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // Events
    event PersonalLoanRequested(
        uint256 indexed loanId,
        address indexed user,
        uint256 amount
    );

    /**
     * @dev This function is used for potential seekers to request a personal loan.
     * @param amountRequested The lending amount seeker is looking to get.
     * @param collateralToken The token that will be used by the seeker as collateral.
     * @param collateralAmount The amount of tokens that will be used by the seeker as collateral.
     * @param totalAmountOfBatches The amount of batches in which loan will be repaid.
     * @param interestPercentage The interest percentage that will be obtained after whole repayment.
     * @param batchTimeInterval The time interval between repayment batches.
     * @param extraInfo The ipfs hash where more specific details for loan request are stored.
     * @param repaymentBatchType The way the repayment in each batch will happen. [ONLY_INTEREST or INTEREST_PLUS_NOMINAL]
     *        ONLY_INTEREST means that in every batch part of the interest will be repaid and whole nominal in the last batch.
     *        INTEREST_PLUS_NOMINAL means that in every batch part of the interest and nominal will be repaid.
     */
    function requestPersonalLoan(
        uint256 amountRequested,
        address collateralToken,
        uint256 collateralAmount,
        uint256 totalAmountOfBatches,
        uint256 interestPercentage,
        uint256 batchTimeInterval,
        string memory extraInfo,
        LoanLibrary.RepaymentBatchType repaymentBatchType
    ) external {
        require(uint256(repaymentBatchType) <= 1, "Wrong repayment batch type");
        require(
            amountRequested.mod(baseAmountForEachPartition) == 0,
            "Requested Amount must be a multiplier of base amount"
        );

        _storeLoanDetails(
            LoanLibrary.LoanType.PERSONAL,
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

        IERC20(collateralToken).transferFrom(
            msg.sender,
            address(escrow),
            collateralAmount
        );

        // TODO - Mint Correctly And Burn on Settlement
        // mainNFT.mint(address(escrow));
        fundingNFT.mintGen0(
            address(escrow),
            loanDetails[totalLoans].totalPartitions,
            totalLoans
        );

        fundingNFT.pauseTokenTransfer(totalLoans); //Pause trades for ERC1155s with the specific loan ID.

        governance.requestApproval(totalLoans, false, 0);

        emit PersonalLoanRequested(totalLoans, msg.sender, amountRequested);

        totalLoans = totalLoans.add(1);
    }

    function _storePersonalLoanPayments(
        uint256 totalAmountOfBatches_,
        uint256 batchTimeInterval_,
        LoanLibrary.RepaymentBatchType repaymentBatchType_
    ) internal {
        // Calculate repayment of seeker for each batch.
        if (
            repaymentBatchType_ == LoanLibrary.RepaymentBatchType.ONLY_INTEREST
        ) {
            personalLoanPayments[totalLoans].amountEachBatch = loanDetails[
                totalLoans
            ]
                .totalInterest
                .div(totalAmountOfBatches_);
        } else {
            personalLoanPayments[totalLoans].amountEachBatch = (
                loanDetails[totalLoans].totalInterest.add(
                    loanDetails[totalLoans].lendingAmount
                )
            )
                .div(totalAmountOfBatches_);
        }

        personalLoanPayments[totalLoans]
            .totalAmountOfBatches = totalAmountOfBatches_;
        personalLoanPayments[totalLoans]
            .timeIntervalBetweenBatches = batchTimeInterval_;
        personalLoanPayments[totalLoans]
            .repaymentBatchType = repaymentBatchType_;
    }

    function _startPersonalLoan(uint256 loanId_) internal {
        personalLoanPayments[loanId_].batchStartingTimestamp = block.timestamp;
        personalLoanPayments[loanId_].batchDeadlineTimestamp = block
            .timestamp
            .add(personalLoanPayments[loanId_].timeIntervalBetweenBatches);

        escrow.transferLendingToken(
            loanSeeker[loanId_],
            loanDetails[loanId_].lendingAmount
        );
    }

    function _challengePersonalLoan(uint256 loanId_) internal {
        personalLoanPayments[loanId_].batchesSkipped = personalLoanPayments[
            loanId_
        ]
            .batchesSkipped
            .add(1);

        if (personalLoanPayments[loanId_].batchesSkipped > 1) {
            loanStatus[loanId_] == LoanLibrary.LoanStatus.DEFAULT;
            // TODO - SPECIFY DEFAULT
        } else {
            personalLoanPayments[loanId_]
                .batchDeadlineTimestamp = personalLoanPayments[loanId_]
                .batchDeadlineTimestamp
                .add(personalLoanPayments[loanId_].timeIntervalBetweenBatches);
        }
    }

    function _executePersonalLoanPayment(uint256 loanId_)
        internal
        onlyBetweenBatchTimeframe(loanId_)
        onlyActiveLoan(loanId_)
    {
        //if interest + nominal
        if (
            personalLoanPayments[loanId_].repaymentBatchType ==
            LoanLibrary.RepaymentBatchType.INTEREST_PLUS_NOMINAL
        ) {
            _transferPersonalLoanPayment(
                loanId_,
                personalLoanPayments[loanId_].amountEachBatch
            );
        } else {
            //if interest only
            _executePersonalLoanInterestOnlyPayment(loanId_);
        }
    }

    function _executePersonalLoanInterestOnlyPayment(uint256 loanId_) internal {
        uint256 amount;
        //if last batch
        if (
            personalLoanPayments[loanId_].batchesPaid.add(1) ==
            personalLoanPayments[loanId_].totalAmountOfBatches
        ) {
            amount = personalLoanPayments[loanId_].amountEachBatch.add(
                loanDetails[loanId_].lendingAmount
            );
        } else {
            //any other batch
            amount = personalLoanPayments[loanId_].amountEachBatch;
        }
        _transferPersonalLoanPayment(loanId_, amount);
    }

    function _transferPersonalLoanPayment(uint256 loanId_, uint256 amount)
        internal
    {
        IERC20(lendingToken).transferFrom(msg.sender, address(escrow), amount);

        personalLoanPayments[loanId_].batchesPaid = personalLoanPayments[
            loanId_
        ]
            .batchesPaid
            .add(1);

        if (
            personalLoanPayments[loanId_].batchesPaid ==
            personalLoanPayments[loanId_].totalAmountOfBatches
        ) {
            loanStatus[loanId_] = LoanLibrary.LoanStatus.SETTLED;
            escrow.transferCollateralToken(
                loanDetails[loanId_].collateralToken,
                loanSeeker[loanId_],
                loanDetails[loanId_].collateralAmount
            );
        } else {
            personalLoanPayments[loanId_]
                .batchStartingTimestamp = personalLoanPayments[loanId_]
                .batchDeadlineTimestamp;
            personalLoanPayments[loanId_]
                .batchDeadlineTimestamp = personalLoanPayments[loanId_]
                .batchStartingTimestamp
                .add(personalLoanPayments[loanId_].timeIntervalBetweenBatches);
        }
    }

    function _receivePersonalLoanPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_
    ) internal onlySettledLoan(loanId_) {
        uint256 batchesToBePaid =
            generation_.sub(personalLoanPayments[loanId_].batchesPaid);
        require(batchesToBePaid > 0, "Not eligible for payment");

        uint256 amountToBePaid =
            personalLoanPayments[loanId_]
                .amountEachBatch
                .mul(amountOfTokens_)
                .mul(batchesToBePaid)
                .div(loanDetails[loanId_].totalPartitions);

        if (loanStatus[loanId_] == LoanLibrary.LoanStatus.SETTLED) {
            if (
                personalLoanPayments[loanId_].repaymentBatchType ==
                LoanLibrary.RepaymentBatchType.ONLY_INTEREST
            ) {
                amountToBePaid = amountToBePaid.add(
                    loanDetails[loanId_].lendingAmount.mul(amountOfTokens_).div(
                        loanDetails[loanId_].totalPartitions
                    )
                );
            }

            fundingNFT.burn(
                msg.sender,
                generation_.getTokenId(loanId_),
                amountOfTokens_
            );
        } else {
            fundingNFT.increaseGenerations(
                generation_.getTokenId(loanId_),
                msg.sender,
                amountOfTokens_,
                batchesToBePaid
            );
        }

        escrow.transferLendingToken(msg.sender, amountToBePaid);
    }
}
