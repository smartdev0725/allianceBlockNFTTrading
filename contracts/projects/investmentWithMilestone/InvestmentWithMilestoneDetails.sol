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
        uint256 amountRequestedToBeRaised_,
        address investmentToken_,
        uint256[] memory amountPerMilestone,
        uint256[] memory milestoneDurations,
        string memory extraInfo_
    ) internal returns (uint256 totalAmountRequested, uint256 projectId) {
        projectId = projectManager.createProject();

        ProjectLibrary.InvestmentMilestoneDetails memory investmentWithMilestones;

        for (uint256 i = 0; i < amountPerMilestone.length; i++) {
            // Milestone store
            totalAmountRequested = totalAmountRequested.add(amountPerMilestone[i]);
        }

        investmentWithMilestones.investmentId = projectId;
        investmentWithMilestones.investmentToken = investmentToken_;
        investmentWithMilestones.investmentTokensAmountPerMilestone = amountPerMilestone;
        investmentWithMilestones.lendingToken = lendingToken_;
        investmentWithMilestones.durationPerMilestone = milestoneDurations;
        investmentWithMilestones.extraInfo = extraInfo_;
        investmentWithMilestones.totalAmountToBeRaised = amountRequestedToBeRaised_;
        investmentWithMilestones.totalPartitionsToBePurchased = totalAmountRequested.div(baseAmountForEachPartition);
    }
}
