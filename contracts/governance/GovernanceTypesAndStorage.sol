// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStaking.sol";
import "../libs/ValuedDoubleLinkedList.sol";
import "../libs/DoubleLinkedList.sol";

/**
 * @title AllianceBlock GovernanceStorage contract
 * @notice Responsible for governance storage
 */
contract GovernanceTypesAndStorage {
    using ValuedDoubleLinkedList for ValuedDoubleLinkedList.LinkedList;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    enum VotingStatusMembers {
        EMPTY_STATE, // The state where stakers cannot even subscribe for dao membership.
        PRE_STATE, // The state where stakers can only subscribe for future dao membership.
        VOTING, // The state where stakers are voting for dao delegators and members.
        CLAIM_MEMBERSHIP, // The state where dao members are claiming their membership.
        LATE_MEMBERSHIP_CLAIMING // The state where unclaimed spots for dao membership are filled.
    }

    enum VotingStatusDelegators {
        PRE_STATE, // The state where active dao members can only subscribe to become future dao delegators.
        VOTING, // The state where active dao members are voting for dao delegators.
        APPROVE_VOTING, // The state where dao members are approving the voting for dao delegators.
        CLAIM_DELEGATION, // The state where dao delegators are claiming their delegation privilages.
        LATE_DELEGATION_CLAIMING // The state where unclaimed spots for dao delegation are filled.
    }

    struct ApprovalRequest {
        uint256 loanId; // The loan id for which approcal is requested.
        bool isMilestone; // true if approval reuested is connected to a milestone and false if not.
        uint256 milestoneNumber; // The milestone number if is Milestone based request.
        uint256 deadlineTimestamp; // The deadline timestamp to approve this request.
        uint256 approvalsProvided; // The number of approvals that this request has gathered.
        bool isApproved; // True if request is approved, false if not.
        uint256 epochSubmitted; // The epoch that the request was submitted.
    }

    VotingStatusMembers public votingStatusForDaoMembers;
    VotingStatusDelegators public votingStatusForDaoDelegators;

    mapping(address => mapping(uint256 => bool)) public isEpochDaoMember;
    mapping(address => mapping(uint256 => bool)) public isEpochDaoDelegator;
    mapping(address => mapping(uint256 => bool)) public hasVotedForRequestId;
    mapping(uint256 => mapping(uint256 => bool)) public bannedDelegator;
    mapping(uint256 => uint256) public amountOfEpochDaoMembersNeededPerEpoch;
    mapping(uint256 => uint256) public amountOfEpochDaoDelegatorsNeededPerEpoch;

    mapping(address => bool) public subscribedForDaoMembership;
    mapping(address => bool) public subscribedForDaoDelegator;

    mapping(uint256 => uint256) public rewardsForDaoMembersPerEpoch;
    mapping(uint256 => uint256) public rewardsForDaoDelegatorsPerEpoch;

    ValuedDoubleLinkedList.LinkedList public daoSubstituteMembersListForCurrentEpoch;
    ValuedDoubleLinkedList.LinkedList public daoSubstituteDelegatorsListForCurrentEpoch;
    ValuedDoubleLinkedList.LinkedList public daoMembersListForUpcomingEpoch;
    ValuedDoubleLinkedList.LinkedList public daoDelegatorsListForUpcomingEpoch;

    mapping(uint256 => DoubleLinkedList.LinkedList) public requestsPerEpoch;
    mapping(uint256 => DoubleLinkedList.LinkedList) public remainingDelegatorIdsToVotePerRequest;
    mapping(uint256 => DoubleLinkedList.LinkedList) public remainingMemberIdsToVoteForDelegator;
    mapping(uint256 => DoubleLinkedList.LinkedList) public remainingMemberIdsToVotePerRequest; // For governance changes requests - TODO

    mapping(uint256 => DoubleLinkedList.LinkedList) public epochDaoMembers;
    mapping(uint256 => DoubleLinkedList.LinkedList) public epochDaoDelegators;

    mapping(address => mapping(uint256 => bool)) public hasVotedForDaoMemberPerEpoch;
    mapping(address => mapping(uint256 => bool)) public hasVotedForDaoDelegatorPerEpoch;
    mapping(address => mapping(uint256 => bool)) public hasApprovedForDaoDelegatorPerEpoch;

    mapping(address => mapping(uint256 => bytes32)) public votingHashOfDaoMembersPerEpoch;

    mapping(address => uint256) public addressToId;
    mapping(uint256 => address) public idToAddress;

    uint256 public totalApprovalRequests; // The total amount of approvals requested.

    address public superDelegator;

    mapping(uint256 => ApprovalRequest) public approvalRequests;

    IRegistry public registry;
    IStaking public staking;

    uint256 public totalIds;
    uint256 public currentEpoch;

    mapping(uint256 => uint256) public amountOfSubstitutesRequested; // This is true when a delegator substitute request is active

    mapping(bytes32 => uint256) public updatableVariables;

    // CRONJOB types and variables
    enum CronjobType {
        DAO_APPROVAL, // Cronjob type for approvals on registry requests.
        DAO_VOTING_REQUEST, // Cronjob type for dao ecosystem change requests.
        DAO_MEMBERSHIP_VOTING, // Cronjob type for dao membership voting.
        DAO_DELEGATORS_VOTING, // Cronjob type for dao delegation voting.
        DAO_REWARDS_PROVISION, // Cronjob type for rewards provision in case there is a pending request and rewards after epoch change.
        DAO_SUBSTITUTES // Cronjob type for dao substitutes to enter till list is renewed (if not filled).
    }

    struct Cronjob {
        CronjobType cronjobType; // This is the cronjob type.
        uint256 externalId; // This is the id of the request in case of dao approval or change voting request.
    }

    // TODO - Make this simple linked list, not double (we don't need to remove anything else than head MAYBE).
    ValuedDoubleLinkedList.LinkedList public cronjobList;
    uint256 public totalCronjobs;

    mapping(uint256 => Cronjob) public cronjobs; // cronjobId to Cronjob.

    // MODIFIERS

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "Only Registry contract");
        _;
    }

    modifier onlyDaoDelegatorNotVoted(uint256 requestId, uint256 epochSubmitted) {
        require(isEpochDaoDelegator[msg.sender][epochSubmitted], "Only Dao Delegator for the epoch request was submitted");
        require(!hasVotedForRequestId[msg.sender][requestId], "Only if not voted yet");
        _;

        hasVotedForRequestId[msg.sender][requestId] = true;
    }

    modifier onlyBeforeDeadline(uint256 requestId) {
        require(approvalRequests[requestId].deadlineTimestamp > block.timestamp,
            "Only before deadline is reached");
        _;
    }

    modifier onlyAfterDeadlineAndNotApproved(uint256 requestId) {
        require(approvalRequests[requestId].deadlineTimestamp <= block.timestamp,
            "Only after deadline is reached");
        require(!approvalRequests[requestId].isApproved, "Only if not already approved");
        _;
    }
}
