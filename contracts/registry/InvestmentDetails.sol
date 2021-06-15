// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Storage.sol";
import "../libs/TokenFormat.sol";

/**
 * @title AllianceBlock InvestmentDetails contract
 * @notice Functionality for storing investment details and modifiers.
 * @dev Extends Storage
 */
contract InvestmentDetails is Storage {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    modifier onlyGovernance() {
        require(msg.sender == address(governance), "Only Governance");
        _;
    }

    /**
     * @notice Stores Investment Details
     * @dev require a valid interest percentage
     * @param amountRequestedToBeRaised_ the amount requested
     * @param projectToken_ the project token
     * @param projectTokensAmount_ the amount of project tokens provided
     * @param extraInfo_ the IPFS hard data provided
     */
    function _storeInvestmentDetails(
        uint256 amountRequestedToBeRaised_,
        address projectToken_,
        uint256 projectTokensAmount_,
        string memory extraInfo_
    ) internal {
        InvestmentLibrary.InvestmentDetails memory investment;
        investment.investmentId = totalInvestments;
        investment.projectToken = projectToken_;
        investment.projectTokensAmount = projectTokensAmount_;
        investment.totalAmountToBeRaised = amountRequestedToBeRaised_;
        investment.extraInfo = extraInfo_;
        investment.totalPartitionsToBePurchased = amountRequestedToBeRaised_.div(baseAmountForEachPartition);

        investmentDetails[totalInvestments] = investment;

        investmentStatus[totalInvestments] = InvestmentLibrary.InvestmentStatus.REQUESTED;
        investmentSeeker[totalInvestments] = msg.sender;
    }
}
