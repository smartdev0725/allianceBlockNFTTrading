// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "./DaoCronjob.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract SuperGovernance is Ownable, DaoCronjob {
    using SafeMath for uint256;

    function initialize(
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

    function openDaoMembershipSubscriptions()
    external
    onlyOwner()
    {
        votingStatusForDaoMembers = VotingStatusMembers.PRE_STATE;
    }

    function openDaoMembershipVoting()
    external
    onlyOwner()
    {
        votingStatusForDaoMembers = VotingStatusMembers.VOTING;
    }

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

    function openDaoDelegatingVoting()
    external
    onlyOwner()
    {
        votingStatusForDaoDelegators = VotingStatusDelegators.VOTING;
    }

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
