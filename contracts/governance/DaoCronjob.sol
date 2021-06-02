// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GovernanceTypesAndStorage.sol";
import "../interfaces/IRegistry.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract DaoCronjob is GovernanceTypesAndStorage {
    using SafeMath for uint256;
    using ValuedDoubleLinkedList for ValuedDoubleLinkedList.LinkedList;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    modifier checkCronjob() {
        checkCronjobs();
        _;
    }

    function checkCronjobs() public returns (bool) {
        uint256 mostRecentCronjobTimestamp = cronjobList.getHeadValue();
        if (mostRecentCronjobTimestamp == 0 || block.timestamp < mostRecentCronjobTimestamp) return false;
        else { // only pop head for now for gas reasons, maybe later we can execute them all together.
            (uint256 head, uint256 timestamp) = cronjobList.popHeadAndValue();
            executeCronjob(head, timestamp);
        }

        return true;
    }

    function executeCronjob(uint256 cronjobId, uint256 timestamp) internal {
        if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_APPROVAL) {
            executeDaoApproval(cronjobs[cronjobId].externalId);
        }
        else {
            updateInvestment(cronjobs[cronjobId].externalId, timestamp);
        }
    }

    function addCronjob(CronjobType cronjobType, uint256 timestamp, uint256 externalId) internal {
        totalCronjobs = totalCronjobs.add(1);
        cronjobs[totalCronjobs] = Cronjob(cronjobType, externalId);
        cronjobList.addNodeIncrement(timestamp, totalCronjobs);
    }

    function removeCronjob(uint256 cronjobId) internal {
        cronjobList.removeNode(cronjobId);
    }

    function updateInvestment(uint256 investmentId, uint256 timestamp) internal {
        if (registry.getRequestingInterestStatus(investmentId)) {
            registry.startLotteryPhase(investmentId);
        }
        else {
            uint256 nextCronjobTimestamp = timestamp.add(
                updatableVariables[keccak256(abi.encode("lateApplicationsForInvestmentDuration"))]);
            addCronjob(CronjobType.INVESTMENT, nextCronjobTimestamp, investmentId);
        }
    }

    function executeDaoApproval(uint256 requestId) internal {
        uint256 approvalsNeeded = updatableVariables[keccak256(abi.encode("approvalsNeededForRegistryRequest"))];
        requestsPerEpoch[approvalRequests[requestId].epochSubmitted].removeNode(requestId);

        bool decision = false;
        if (approvalRequests[requestId].approvalsProvided >= approvalsNeeded) {
            decision = true;
            approvalRequests[requestId].isApproved = true;
        }

        approvalRequests[requestId].isMilestone ?
            registry.decideForMilestone(approvalRequests[requestId].loanId, decision) :
            registry.decideForLoan(approvalRequests[requestId].loanId, decision);

        uint256 numberOfNonVotingDelegators = remainingDelegatorIdsToVotePerRequest[requestId].getSize();

        if (numberOfNonVotingDelegators > 0) {
            penaltizeDelegatorsForNonVoting(numberOfNonVotingDelegators, approvalRequests[requestId].epochSubmitted, requestId);
        }
    }
}
