// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GovernanceTypesAndStorage.sol";
import "../interfaces/IRegistry.sol";
import "../libs/OrderedDoubleLinkedList.sol";
import "../libs/DoubleLinkedList.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev Extends GovernanceTypesAndStorage
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract DaoCronjob is GovernanceTypesAndStorage {
    using SafeMath for uint256;
    using OrderedDoubleLinkedList for OrderedDoubleLinkedList.LinkedList;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    modifier checkCronjob() {
        checkCronjobs();
        _;
    }

    /**
     * @notice Checks if needs to execute a DAO cronJob
     * @dev Calls executeCronjob() at the most 1 cronJob per tx
     */
    function checkCronjobs() public returns (bool) {
        uint256 mostRecentCronjobTimestamp = cronjobList.getHeadValue();
        if (mostRecentCronjobTimestamp == 0 || block.timestamp < mostRecentCronjobTimestamp) return false;
        else {
            // only pop head for now for gas reasons, maybe later we can execute them all together.
            (uint256 head, uint256 timestamp) = cronjobList.popHeadAndValue();
            executeCronjob(head, timestamp);
        }

        return true;
    }

    /**
     * @notice Executes the next DAO cronJob
     * @param cronjobId The cronJob id to be executed.
     * @param timestamp The current block height
     */
    function executeCronjob(uint256 cronjobId, uint256 timestamp) internal {
        updateInvestment(cronjobs[cronjobId].externalId, timestamp);
    }

    /**
     * @notice Adds a cronJob to the queue
     * @dev Adds a node to the cronjobList (OrderedDoubleLinkedList)
     * @param cronjobType The type of cronJob
     * @param timestamp The current block height
     * @param externalId Id of the request in case of dao approval, change voting request or investment
     */
    function addCronjob(
        CronjobType cronjobType,
        uint256 timestamp,
        uint256 externalId
    ) internal {
        totalCronjobs = totalCronjobs.add(1);
        cronjobs[totalCronjobs] = Cronjob(cronjobType, externalId);
        cronjobList.addNodeIncrement(timestamp, totalCronjobs);
    }

    /**
     * @notice Updates an investment
     * @dev checks if lottery should start or adds cronJob for late application
     * @param investmentId The id of the investment to update
     * @param timestamp the current block height
     */
    function updateInvestment(uint256 investmentId, uint256 timestamp) internal {
        if (registry.getRequestingInterestStatus(investmentId)) {
            registry.startLotteryPhase(investmentId);
        } else {
            uint256 nextCronjobTimestamp =
                timestamp.add(updatableVariables[LATE_APPLICATIONS_FOR_INVESTMENT_DURATION]);
            addCronjob(CronjobType.INVESTMENT, nextCronjobTimestamp, investmentId);
        }
    }
}
