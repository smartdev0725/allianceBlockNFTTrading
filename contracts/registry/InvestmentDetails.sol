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
     * @param investmentToken_ the investment token address
     * @param investmentTokensAmount_ the amount of investment tokens provided by the seeker
     * @param extraInfo_ the IPFS hard data provided
     */
    function _storeInvestmentDetails(
        address lendingToken_,
        uint256 amountRequestedToBeRaised_,
        address investmentToken_,
        uint256 investmentTokensAmount_,
        string memory extraInfo_
    ) internal {
        InvestmentLibrary.InvestmentDetails memory investment;
        investment.investmentId = totalInvestments;
        investment.investmentToken = investmentToken_;
        investment.investmentTokensAmount = investmentTokensAmount_;
        investment.totalAmountToBeRaised = amountRequestedToBeRaised_;
        investment.extraInfo = extraInfo_;
        investment.totalPartitionsToBePurchased = amountRequestedToBeRaised_.div(baseAmountForEachPartition);
        investment.lendingToken = lendingToken_;

        investmentDetails[totalInvestments] = investment;

        investmentSeeker[totalInvestments] = msg.sender;
    }
}
