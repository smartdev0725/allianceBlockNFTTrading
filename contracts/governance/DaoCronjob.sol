// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GovernanceTypesAndStorage.sol";
import "../interfaces/IRegistry.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev Extends GovernanceTypesAndStorage
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

    /**
     * @notice Checks if needs to execute a DAO cronJob
     * @dev Calls executeCronjob() at the most 1 cronJob per tx
    */
    function checkCronjobs() public returns (bool) {
        uint256 mostRecentCronjobTimestamp = cronjobList.getHeadValue();
        if (mostRecentCronjobTimestamp == 0 || block.timestamp < mostRecentCronjobTimestamp) return false;
        else { // only pop head for now for gas reasons, maybe later we can execute them all together.
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
        if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_APPROVAL) {
            executeDaoApproval(cronjobs[cronjobId].externalId);
        }
        else if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_VOTING_REQUEST) {
            // TODO - executeDaoRequest(cronjobs[cronjobId].externalId);
        }
        else if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_MEMBERSHIP_VOTING) {
            updateDaoMembershipVotingState(timestamp);
        }
        else if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_DELEGATORS_VOTING) {
            updateDaoDelegationVotingState(timestamp);
        }
        else if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_REWARDS_PROVISION) {
            staking.provideRewards(
                rewardsForDaoMembersPerEpoch[currentEpoch.sub(1)],
                rewardsForDaoDelegatorsPerEpoch[currentEpoch.sub(1)],
                currentEpoch.sub(1)
            );
        }
        else if (cronjobs[cronjobId].cronjobType == CronjobType.DAO_SUBSTITUTES) {
            updateSubstitutes();
        }
        else {
            updateInvestment(cronjobs[cronjobId].externalId, timestamp);
        }
    }

    /**
     * @notice Adds a cronJob to the queue
     * @dev Adds a node to the cronjobList (ValuedDoubleLinkedList)
     * @param cronjobType The type of cronJob
     * @param timestamp The current block height
     * @param externalId Id of the request in case of dao approval, change voting request or investment
    */
     function addCronjob(CronjobType cronjobType, uint256 timestamp, uint256 externalId) internal {
        totalCronjobs = totalCronjobs.add(1);
        cronjobs[totalCronjobs] = Cronjob(cronjobType, externalId);
        cronjobList.addNodeIncrement(timestamp, totalCronjobs);
    }

    /**
     * @notice Removes a cronJob to the queue
     * @dev Removes a node from the cronjobList (ValuedDoubleLinkedList)
     * @param cronjobType The type of cronJob
    */
    function removeCronjob(uint256 cronjobId) internal {
        cronjobList.removeNode(cronjobId);
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
        }
        else {
            uint256 nextCronjobTimestamp = timestamp.add(
                updatableVariables[keccak256(abi.encode("lateApplicationsForInvestmentDuration"))]);
            addCronjob(CronjobType.INVESTMENT, nextCronjobTimestamp, investmentId);
        }
    }

    /**
     * @notice Updates Dao Membership Voting
     * @dev run by the cronJob update
     * @param timestamp The current block height
    */
    function updateDaoMembershipVotingState(uint256 timestamp) internal {
        uint256 nextCronjobTimestamp;

        if (votingStatusForDaoMembers == VotingStatusMembers.VOTING) {
            amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)] = updatableVariables[keccak256(abi.encode("amountOfDaoMembers"))];
            votingStatusForDaoMembers = VotingStatusMembers.CLAIM_MEMBERSHIP;

            nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoClaimingDuration"))]);
            addCronjob(CronjobType.DAO_MEMBERSHIP_VOTING, nextCronjobTimestamp, 0);
        }
        else if (votingStatusForDaoMembers == VotingStatusMembers.CLAIM_MEMBERSHIP) {
            uint256 nodesToRemove = amountOfEpochDaoMembersNeededPerEpoch[currentEpoch];
            if (daoMembersListForUpcomingEpoch.getSize() < amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)].mul(2)) {
                nodesToRemove = amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)].mul(2).sub(daoMembersListForUpcomingEpoch.getSize());
            }
            if (nodesToRemove > 0) {
                daoMembersListForUpcomingEpoch.removeMultipleFromHead(nodesToRemove);
            }

            votingStatusForDaoMembers = VotingStatusMembers.LATE_MEMBERSHIP_CLAIMING;

            if (updatableVariables[keccak256(abi.encode("daoMembershipVotingDuration"))] == 0) {
                nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoLateClaimingDuration"))]);
                addCronjob(CronjobType.DAO_MEMBERSHIP_VOTING, nextCronjobTimestamp, 0);
            }
        }
        else { // ONLY FOR FIRST EPOCH
            delete daoMembersListForUpcomingEpoch;

            currentEpoch = 1;
        }
    }

    /**
     * @notice Updates Dao Delegator Voting
     * @dev run by the cronJob update
     * @param timestamp The current block height
    */
    function updateDaoDelegationVotingState(uint256 timestamp) internal {
        uint256 nextCronjobTimestamp;

        if (votingStatusForDaoDelegators == VotingStatusDelegators.VOTING) {
            votingStatusForDaoDelegators = VotingStatusDelegators.APPROVE_VOTING;

            nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoDelegationApprovalDuration"))]);
        }
        else if (votingStatusForDaoDelegators == VotingStatusDelegators.APPROVE_VOTING) {
            // TODO_MAYBE - Check DAO_MEMBERS not voted
            amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch.add(1)] = updatableVariables[keccak256(abi.encode("amountOfDaoDelegators"))];
            votingStatusForDaoDelegators = VotingStatusDelegators.CLAIM_DELEGATION;

            nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoClaimingDuration"))]);
        }
        else if (votingStatusForDaoDelegators == VotingStatusDelegators.CLAIM_DELEGATION) {
            uint256 nodesToRemove = amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch];
            if (daoMembersListForUpcomingEpoch.getSize() < amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch.add(1)].mul(2)) {
                nodesToRemove = amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch.add(1)].mul(2).sub(daoDelegatorsListForUpcomingEpoch.getSize());
            }
            if (nodesToRemove > 0) {
                daoDelegatorsListForUpcomingEpoch.removeMultipleFromHead(nodesToRemove);
            }

            votingStatusForDaoDelegators = VotingStatusDelegators.LATE_DELEGATION_CLAIMING;

            nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoLateClaimingDuration"))]);
        }
        else {
            nextCronjobTimestamp = changeEpoch(timestamp);
        }

        addCronjob(CronjobType.DAO_DELEGATORS_VOTING, nextCronjobTimestamp, 0);
    }

    /**
     * @notice Updates current protocol epoch
     * @dev run by the cronJob update
     * @param timestamp The current block height
     * @return the next cronJob's block height
    */
    function changeEpoch(uint256 timestamp) internal returns (uint256) {
        daoDelegatorsListForUpcomingEpoch.cloneList(daoSubstituteDelegatorsListForCurrentEpoch);

        delete daoMembersListForUpcomingEpoch;
        delete daoDelegatorsListForUpcomingEpoch;

        votingStatusForDaoMembers = VotingStatusMembers.VOTING;
        votingStatusForDaoDelegators = VotingStatusDelegators.VOTING;

        uint256 nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoMembershipVotingDuration"))]);
        addCronjob(CronjobType.DAO_MEMBERSHIP_VOTING, nextCronjobTimestamp, 0);

        nextCronjobTimestamp = timestamp.add(updatableVariables[keccak256(abi.encode("daoDelegationVotingDuration"))]);

        uint256 requestsRemaining = requestsPerEpoch[currentEpoch].getSize();

        if (requestsRemaining == 0) {
            staking.provideRewards(
                rewardsForDaoMembersPerEpoch[currentEpoch],
                rewardsForDaoDelegatorsPerEpoch[currentEpoch],
                currentEpoch
            );
        }
        else {
            uint256 latestRequestDeadlineTimestamp = checkTimestampOfLastRequestForCurrentEpoch(requestsRemaining);
            addCronjob(CronjobType.DAO_REWARDS_PROVISION, latestRequestDeadlineTimestamp, 0);
        }

        currentEpoch = currentEpoch.add(1);

        return nextCronjobTimestamp;
    }

    /**
     * @notice Executes DAO Approval
     * @dev run by the cronJob update
     * @param requestId The id of the request to be approved by DAO
    */
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

    /**
     * @notice Checks timestamp for latest request for current epoch
     * @dev run by the cronJob update
     * @param requestsRemaining The number of requests remaining
     * @return The latest request block height deadline
    */
    function checkTimestampOfLastRequestForCurrentEpoch(uint256 requestsRemaining) internal returns (uint256) {
        uint256 latestRequestDeadlineTimestamp;

        for (uint256 i = 1; i <= requestsRemaining; i++) {
            uint256 id = requestsPerEpoch[currentEpoch].getIndexedId(i);

            if (approvalRequests[id].deadlineTimestamp > latestRequestDeadlineTimestamp) {
                latestRequestDeadlineTimestamp = approvalRequests[id].deadlineTimestamp;
            }
        }

        return latestRequestDeadlineTimestamp;
    }

    /**
     * @notice Penalizes Active Delegators for not voting
     * @dev run by the cronJob update
     * @param amountOfPenaltizedDelegators the amount of active delegators to penalize
     * @param epochOfRequest the epoch of the request they didn't vote in
     * @param requestId the ID of the request they didn't vote in
    */
    function penaltizeDelegatorsForNonVoting(
        uint256 amountOfPenaltizedDelegators,
        uint256 epochOfRequest,
        uint256 requestId
    )
    internal
    {
        bool isEpochOfRequestSameAsCurrent = currentEpoch == epochOfRequest;

        uint256 amountOfSubstitutes;

        for (uint256 i = 0; i < amountOfPenaltizedDelegators; i++) {
            uint256 idToPenaltize = remainingDelegatorIdsToVotePerRequest[requestId].popHead();

            epochDaoDelegators[epochOfRequest].removeNode(idToPenaltize);
            isEpochDaoDelegator[idToAddress[idToPenaltize]][epochOfRequest] = false;
            bannedDelegator[idToPenaltize][epochOfRequest.add(1)] = true;

            // If he is substitute for current epoch should be removed as well.
            daoSubstituteDelegatorsListForCurrentEpoch.removeNode(idToPenaltize);

            removePenaltizedDelegatorFromActiveRequests(idToPenaltize, epochOfRequest);

            // If he is delegator in current epoch, while current is different that epochOfRequest and should get penaltized.
            if (!isEpochOfRequestSameAsCurrent && isEpochDaoDelegator[idToAddress[idToPenaltize]][currentEpoch]) {
                epochDaoDelegators[currentEpoch].removeNode(idToPenaltize);
                isEpochDaoDelegator[idToAddress[idToPenaltize]][currentEpoch] = false;

                removePenaltizedDelegatorFromActiveRequests(idToPenaltize, currentEpoch);

                amountOfSubstitutes = amountOfSubstitutes.add(1);
            }

            // Remove from voting list for next epoch.
            if (isEpochOfRequestSameAsCurrent) {
                daoDelegatorsListForUpcomingEpoch.removeNode(idToPenaltize);
            }
        }

        if (isEpochOfRequestSameAsCurrent) amountOfSubstitutes = amountOfPenaltizedDelegators;

        if (amountOfSubstitutes > 0) requestSubstitutes(amountOfSubstitutes);
    }

    /**
     * @notice Remove penalized Delegators from Active duty
     * @dev run by the cronJob update
     * @param delegatorId The Id of the Active Delegator to be removed
     * @param epoch the current epoch
    */
    function removePenaltizedDelegatorFromActiveRequests(uint256 delegatorId, uint256 epoch) internal {
        uint256 requestsRemaining = requestsPerEpoch[epoch].getSize();

        if (requestsRemaining > 0) {
            for (uint256 i = 1; i <= requestsRemaining; i++) {
                uint256 id = requestsPerEpoch[epoch].getIndexedId(i);

                remainingDelegatorIdsToVotePerRequest[id].removeNode(delegatorId);
            }
        }
    }

    /**
     * @notice Adds substitutes to all Active Requests
     * @dev run by the cronJob update
     * @param delegatorId The Id of the Active Delegator to be removed
     * @param epoch the current epoch
    */
    function addSubstituteToAllActiveRequests(uint256 delegatorId, uint256 epoch) internal {
        uint256 requestsRemaining = requestsPerEpoch[epoch].getSize();

        if (requestsRemaining > 0) {
            for (uint256 i = 1; i <= requestsRemaining; i++) {
                uint256 id = requestsPerEpoch[epoch].getIndexedId(i);

                remainingDelegatorIdsToVotePerRequest[id].addNode(delegatorId);
            }
        }
    }

    /**
     * @notice Updates Delegator substitutes
     * @dev run by the cronJob update
    */
    function updateSubstitutes() internal {
        if (amountOfSubstitutesRequested[currentEpoch] > 0) {
            for (uint256 i = 0; i < amountOfSubstitutesRequested[currentEpoch]; i++) {
                daoSubstituteDelegatorsListForCurrentEpoch.popHead();
            }

            addCronjob(
                CronjobType.DAO_SUBSTITUTES,
                block.timestamp.add(updatableVariables[keccak256(abi.encode("daoDelegationSubstituteClaimDuration"))]),
                0
            );
        }
    }

    /**
     * @notice Requests substitutes for DAO Delegator
     * @dev run by the cronJob update
     * @param amountOfSubstitutes the amount of subs positions to fill
    */
    function requestSubstitutes(uint256 amountOfSubstitutes) internal {
        amountOfSubstitutesRequested[currentEpoch] = amountOfSubstitutes;

        addCronjob(
            CronjobType.DAO_SUBSTITUTES,
            block.timestamp.add(updatableVariables[keccak256(abi.encode("daoDelegationSubstituteClaimDuration"))]),
            0
        );
    }
}
