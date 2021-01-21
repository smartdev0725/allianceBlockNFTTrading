// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.0;

library LoanLibrary {

    enum RepaymentBatchType {
        ONLY_INTEREST, // The interest is repaid in each batch and at the last batch nominal is also repaid.
        INTEREST_PLUS_NOMINAL // In every batch part of nominal alongside interest is getting repaid.
    }

    // enum RepaymentAssetType {
    //     LENDING_ASSET, // The repayment asset is the asset lended by lenders.
    //     COLLATERAL_ASSET // The repayment asset is same as collateral asset.
    // }

    enum AmountProvisionType {
        WHOLY_PROVIDED, // The lending amount is fully provided to borrower as long as it is gathered.
        BATCH_PROVIDED // The lending amount is provided to borrower in batches/milestones.
    }

    enum LoanStatus {
        REQUESTED, // Status when loan has been requested, but not approved yet.
        APPROVED, // Status when loan has been approved from governors.
        FUNDING, // Status when loan has started getting funded, but not fully funded yet.
        STARTED, // Status when loan has been fully funded.
        SETTLED, // Status when loan has been fully repaid by the borrower.
        DEFAULT, // Status when borrower has not been able to repay the loan.
        LIQUIDATED, // Status when collateral's value was not enough, so loan got liquidated.
        REJECTED // Status when loan has been rejected by governors.
    }

    struct LoanDetails {
        uint256 loanId, // The Id of the loan.
        address collateralToken, // The address of the token that was put as collateral for the loan.
        uint256 collateralAmount, // The amount of collateral tokens locked as colateral.
        uint256 lendingAmount, // The amount of tokens that was lended to the borrower.
        uint256 totalAmountOfBatches, // The total amount of batches for the loan repayment.
        uint256 totalPartitions, // The total partitions or ERC1155 tokens, in which loan is splitted.
        uint256 totalInterest, // The amount of interest to be paid.
        uint256 timeIntervalBetweenBatches, // The time interval, which represents how often borrower should pay a batch.
        bytes32 extraInfo // The ipfs hash, where all extra info about the loan are stored.
    }

    struct LoanTypes {
        RepaymentBatchType repaymentBatchType, // The repayment batch type of the loan.
        // RepaymentAssetType repaymentAssetType, // The repayment asset type of the loan.
        AmountProvisionType amountProvisionType, // The amount provision type of the loan.
    }

    struct LoanPayments {
        uint256 startingDate, // The timestamp in which loan was funded.
        uint256 partitionsPurchased, // The total partitions or ERC1155 tokens that have already been purchased.
        uint256 batchesPaid, // The amount of batches that have been paid by the borrower.
        uint256 amountEachBatch, // The amount to be paid in each batch by the borrower.
        uint256 lendingAmountEachBatch, // The amount to be provided to borrower, when AmountProvisionType is BATCH_PROVIDED.
        uint256 batchesSkipped, // The times that borrower skipped the payment (only 1 is accepted, then loan gets to DEFAULT).
        uint256 batchDeadlineTimestamp, // Timestamp till which borrower should pay next batch.
        uint256 batchStartingTimestamp // Timestamp from which borrower is able to pay next batch.
    }
}
