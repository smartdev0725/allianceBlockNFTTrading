// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.6;

/**
 * @title Investment Library
 */
library ProjectLibrary {
    enum ProjectStatus {
        REQUESTED, // Status when investment has been requested, but not approved yet.
        APPROVED, // Status when investment has been approved from governors.
        STARTED, // Status when investment has been fully funded.
        SETTLED, // Status when investment has been fully repaid by the seeker.
        DEFAULT, // Status when seeker has not been able to repay the investment.
        REJECTED // Status when investment has been rejected by governors.
    }

    struct InvestmentDetails {
        uint256 investmentId; // The Id of the investment.
        uint256 approvalDate; // The timestamp in which investment was approved.
        uint256 startingDate; // The timestamp in which investment was funded.
        address investmentToken; // The address of the token that will be sold to investors.
        uint256 investmentTokensAmount; // The amount of investment tokens that are deposited for investors by the seeker.
        address lendingToken; // The address of the token that investors should pay with.
        uint256 totalAmountToBeRaised; // The amount of lending tokens that seeker of investment will raise after all tickets are purchased.
        uint256 totalPartitionsToBePurchased; // The total partitions or ERC1155 tokens, in which investment is splitted.
        string extraInfo; // The ipfs hash, where all extra info about the investment are stored.
        uint256 partitionsRequested; // The total partitions or ERC1155 tokens that are requested for purchase.
    }

    struct InvestmentMilestoneDetails {
        uint256 investmentId; // The Id of the investment.
        uint256 approvalDate; // The timestamp in which investment was approved.
        uint256 startingDate; // The timestamp in which investment was funded.
        address investmentToken; // The address of the token that will be sold to investors.
        uint256[] investmentTokensAmountPerMilestone;
        uint256[] durationPerMilestone;
        address lendingToken; // The address of the token that investors should pay with.
        uint256[] eachAmountToBeRaisedPerMilestone; // The amount of lending tokens that seeker of investment will raise after all tickets are purchased per milestone.
        uint256[] eachPartitionsToBePurchasedPerMilestone; // The each milestone's partitions or ERC1155 tokens, in which investment is splitted.
        string extraInfo; // The ipfs hash, where all extra info about the investment are stored.
        uint256 partitionsRequested; // The total partitions or ERC1155 tokens that are requested for purchase.
    }
}
