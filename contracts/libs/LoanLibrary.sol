// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

library LoanLibrary {
    enum RepaymentBatchType {
        ONLY_INTEREST, // The interest is repaid in each batch and at the last batch nominal is also repaid.
        INTEREST_PLUS_NOMINAL // In every batch part of nominal alongside interest is getting repaid.
    }

    enum LoanType {
        PERSONAL, // The type of loan where seeker is a person.
        PROJECT, // The type of loan where seeker is a project.
        INVESTMENT // The type of loan where seeker is a project seeking for IDO.
    }

    enum LoanStatus {
        REQUESTED, // Status when loan has been requested, but not approved yet.
        APPROVED, // Status when loan has been approved from governors.
        FUNDING, // Status when loan has started getting funded, but not fully funded yet.
        STARTED, // Status when loan has been fully funded.
        AWAITING_MILESTONE_APPROVAL, // Status when loan is waiting for DAO to approve a finished milestone.
        AWAITING_REPAYMENT, // Status when milestones have all been delivered and waiting for repayment from the project.
        SETTLED, // Status when loan has been fully repaid by the seeker.
        DEFAULT, // Status when seeker has not been able to repay the loan.
        LIQUIDATED, // Status when collateral's value was not enough, so loan got liquidated.
        REJECTED, // Status when loan has been rejected by governors.
        // TEMPORAL: waiting for status order and to not break test
        AWAITING_MILESTONE_APPLICATION // Status when loan is waiting for milestone application by the project.
    }

    struct LoanDetails {
        uint256 loanId; // The Id of the loan.
        LoanType loanType; // The type of the loan (personal or project).
        uint256 approvalDate; // The timestamp in which loan was approved.
        uint256 startingDate; // The timestamp in which loan was funded.
        address collateralToken; // The address of the token that was put as collateral for the loan.
        uint256 collateralAmount; // The amount of collateral tokens locked as colateral.
        uint256 lendingAmount; // The amount of tokens that was lended to the seeker.
        uint256 totalPartitions; // The total partitions or ERC1155 tokens, in which loan is splitted.
        uint256 totalInterest; // The amount of interest to be paid.
        uint256 interestPercentage; // The interest percentage to pay back over the amount in lending tokens.
        string extraInfo; // The ipfs hash, where all extra info about the loan are stored.
        uint256 partitionsPurchased; // The total partitions or ERC1155 tokens that have already been purchased.
    }

    struct PersonalLoanPayments {
        uint256 batchesPaid; // The amount of batches that have been paid by the seeker.
        uint256 amountEachBatch; // The amount to be paid in each batch by the seeker.
        uint256 totalAmountOfBatches; // The total amount of batches for the loan repayment.
        uint256 timeIntervalBetweenBatches; // The time interval, which represents how often seeker should pay a batch.
        uint256 batchesSkipped; // The times that seeker skipped the payment (only 1 is accepted, then loan gets to DEFAULT).
        uint256 batchStartingTimestamp; // Timestamp from which seeker is able to pay next batch.
        uint256 batchDeadlineTimestamp; // Timestamp till which seeker should pay next batch.
        RepaymentBatchType repaymentBatchType; // The repayment batch type of the loan.
    }

    struct ProjectLoanPayments {
        uint256 totalMilestones;
        mapping(uint256 => uint256) milestoneLendingAmount;
        mapping(uint256 => uint256) milestoneDuration;
        uint256 awaitingForRepaymentDate; // The timestamp in which loan state changed to awaitingForRepayment.
        uint256 paymentTimeInterval; // The time interval that will pass between last milestone delivery and repayment.
        uint256 milestonesDelivered; // The amount of milestones that have been delivered by the project.
        uint256 milestonesExtended; // The times that project has taken an extension for milestone delivery.
        uint256 currentMilestoneStartingTimestamp; // Timestamp that milestone/repayment started.
        uint256 currentMilestoneDeadlineTimestamp; // Timestamp that milestone/repayment should be delivered.
        uint256 discountPerMillion; // The discount / 1M if lenders decide to get paid by the project tokens.
        mapping(uint256 => uint256) milestoneProjectTokenPrice; // The price the project tokens can be claimed for after delivery of the milestone.
        uint256 partitionsPaidInProjectTokens; // The number of partitions lenders used to claim project tokens.
    }
}
