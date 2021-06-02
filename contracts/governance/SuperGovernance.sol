// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "./DaoCronjob.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev Extends OwnableUpgradeable, DaoCronjob
 * @notice Responsible for govern AllianceBlock's ecosystem
*/
contract SuperGovernance is OwnableUpgradeable, DaoCronjob {
    using SafeMath for uint256;

    /**
     * @notice Sets Registry and Staking contracts
     * @dev used to initialize SuperGovernance
     * @dev requires not already initialized
     * @param registryAddress_ the Registry address
     * @param stakingAddress_ the Stake address
    */
    function setRegistryAndStaking(
        address registryAddress_,
        address stakingAddress_
    )
    external
    onlyOwner()
    {
        require(address(registry) == address(0), "Cannot initialize second time");
        registry = IRegistry(registryAddress_);
        staking = IStaking(stakingAddress_);

        emit InitGovernance(registryAddress_, stakingAddress_, msg.sender);
    }

    /**
     * @notice Votes for Request
     * @dev Executes cronJob
     * @dev requires msg.sender to be Super Delegator
     * @dev requires current epoch to be 0 or 1
     * @param requestId the Request ID
     * @param decision the decision (Approve / Deny)
    */
    function superVoteForRequest(
        uint256 requestId,
        bool decision
    )
    external
    checkCronjob()
    {
        require(msg.sender == superDelegator, "Only super delegator can call this function");
        require(currentEpoch <= 1, "Super delegating works only till first epoch");

        if(approvalRequests[requestId].isMilestone) {
            registry.decideForMilestone(approvalRequests[requestId].loanId, decision);
        } else {
            registry.decideForLoan(approvalRequests[requestId].loanId, decision);
        }

        if(decision) {
            approvalRequests[requestId].approvalsProvided = approvalRequests[requestId].approvalsProvided.add(1);
            approvalRequests[requestId].isApproved = true;
        }

        emit VotedForRequest(approvalRequests[requestId].loanId, requestId, decision, msg.sender);
    }

    /**
     * @notice Opens DAO Membership Subscriptions
     * @dev First step towards transitioning to second epoch
    */
    function openDaoMembershipSubscriptions()
    external
    onlyOwner()
    {
        votingStatusForDaoMembers = VotingStatusMembers.PRE_STATE;
    }

    /**
     * @notice Opens DAO Membership Voting
     * @dev Second step towards transitioning to second epoch
    */
    function openDaoMembershipVoting()
    external
    onlyOwner()
    {
        votingStatusForDaoMembers = VotingStatusMembers.VOTING;
    }

    /**
     * @notice Opens DAO Delegator Subscriptions
     * @dev Third step towards transitioning to second epoch
     * @param amountOfDaoMembers_ the amount of DAO Members to allow
     * @param daoClaimingDuration_ the duration of the claiming period
     * @param daoLateClaimingDuration_ the duration of the late-claim period
    */
    function openDaoDelegatingSubscriptions(
        uint256 amountOfDaoMembers_,
        uint256 daoClaimingDuration_,
        uint256 daoLateClaimingDuration_
    )
    external
    onlyOwner()
    {
        updatableVariables[keccak256(abi.encode("amountOfDaoMembers"))] = amountOfDaoMembers_;
        updatableVariables[keccak256(abi.encode("daoClaimingDuration"))] = daoClaimingDuration_;
        updatableVariables[keccak256(abi.encode("daoLateClaimingDuration"))] = daoLateClaimingDuration_;

        votingStatusForDaoMembers = VotingStatusMembers.CLAIM_MEMBERSHIP;

        addCronjob(CronjobType.DAO_MEMBERSHIP_VOTING, block.timestamp.add(daoClaimingDuration_), 0);

        amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)] = amountOfDaoMembers_;
    }

    /**
     * @notice Opens DAO Delegator Voting
     * @dev Fourth step towards transitioning to second epoch
    */
    function openDaoDelegatingVoting()
    external
    onlyOwner()
    {
        votingStatusForDaoDelegators = VotingStatusDelegators.VOTING;
    }

    /**
     * @notice Opens DAO Delegator
     * @dev Fifth (last) step towards transitioning to second epoch
     * @param amountOfDaoDelegators_ the amount of DAO Delegators
     * @param daoMembershipVotingDuration_ the duration for Members to vote
     * @param daoDelegationVotingDuration_ the duration for Delegators to vote
     * @param daoDelegationApprovalDuration_ the approval period for Delegators to vote
     * @param daoDelegationSubstituteClaimDuration_ the period in which subs can claim their Delegator position
    */
    function openDaoDelegating(
        uint256 amountOfDaoDelegators_,
        uint256 daoMembershipVotingDuration_,
        uint256 daoDelegationVotingDuration_,
        uint256 daoDelegationApprovalDuration_,
        uint256 daoDelegationSubstituteClaimDuration_
    )
    external
    onlyOwner()
    {
        updatableVariables[keccak256(abi.encode("amountOfDaoDelegators"))] = amountOfDaoDelegators_;
        updatableVariables[keccak256(abi.encode("daoMembershipVotingDuration"))] = daoMembershipVotingDuration_;
        updatableVariables[keccak256(abi.encode("daoDelegationVotingDuration"))] = daoDelegationVotingDuration_;
        updatableVariables[keccak256(abi.encode("daoDelegationApprovalDuration"))] = daoDelegationApprovalDuration_;
        updatableVariables[keccak256(abi.encode("daoDelegationSubstituteClaimDuration"))] = daoDelegationSubstituteClaimDuration_;

        votingStatusForDaoDelegators = VotingStatusDelegators.APPROVE_VOTING;

        addCronjob(CronjobType.DAO_DELEGATORS_VOTING, block.timestamp.add(daoDelegationApprovalDuration_), 0);

        uint256 timestampToOpenDaoMembershipVoting =
            block.timestamp.add(daoDelegationApprovalDuration_).add(
            updatableVariables[keccak256(abi.encode("daoClaimingDuration"))]).add(
            updatableVariables[keccak256(abi.encode("daoLateClaimingDuration"))]);

        addCronjob(CronjobType.DAO_MEMBERSHIP_VOTING, timestampToOpenDaoMembershipVoting, 0);
    }
}
