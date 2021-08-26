// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Storage.sol";
import "../../libs/TokenFormat.sol";
import "../BaseProject/BaseProject.sol";

/**
 * @title AllianceBlock InvestmentDetails contract
 * @notice Functionality for storing investment details and modifiers.
 * @dev Extends Storage
 */
contract InvestmentWithMilestoneDetails is Storage, BaseProject {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    function _storeMilestoneDetailsAndGetTotalAmount(
        address lendingToken_,
        uint256[] memory amountRequestedToBeRaised_,
        address investmentToken_,
        uint256[] memory amountPerMilestone,
        uint256[] memory milestoneDurations,
        string memory extraInfo_
    ) internal returns (uint256 totalAmount, uint256 projectId, uint256 totalAmountRequested) {
        projectId = projectManager.createProject();

        ProjectLibrary.InvestmentMilestoneDetails memory investmentWithMilestones;
        uint[] memory partitionsToBePurchased = new uint[](amountPerMilestone.length);

        for (uint256 i = 0; i < amountPerMilestone.length; i++) {
            // Milestone store
            totalAmount = totalAmount.add(amountPerMilestone[i]);
            partitionsToBePurchased[i] = amountPerMilestone[i].div(baseAmountForEachPartition);
            totalAmountRequested += partitionsToBePurchased[i];
        }

        investmentWithMilestones.investmentId = projectId;
        investmentWithMilestones.investmentToken = investmentToken_;
        investmentWithMilestones.investmentTokensAmountPerMilestone = amountPerMilestone;
        investmentWithMilestones.lendingToken = lendingToken_;
        investmentWithMilestones.durationPerMilestone = milestoneDurations;
        investmentWithMilestones.extraInfo = extraInfo_;
        investmentWithMilestones.eachAmountToBeRaisedPerMilestone = amountRequestedToBeRaised_;
        investmentWithMilestones.eachPartitionsToBePurchasedPerMilestone = partitionsToBePurchased;

        investmentMilestoneDetails[projectId] = investmentWithMilestones;

        projectSeeker[projectId] = msg.sender;
    }
}
