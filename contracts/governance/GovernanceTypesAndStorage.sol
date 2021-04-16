// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "./interfaces/IRegistry.sol";
import "./interfaces/IStaking.sol";
import "../libs/ValuedDoubleLinkedList.sol";

/**
 * @title AllianceBlock GovernanceStorage contract
 * @notice Responsible for governance storage
 */
contract GovernanceTypesAndStorage {
    using ValuedDoubleLinkedList for ValuedDoubleLinkedList.LinkedList;

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "Only Registry contract");
        _;
    }

    modifier onlyDaoDelegatorNotVoted(uint256 requestId) {
        require(isDaoDelegator[msg.sender], "Only Dao Delegator");
        require(!hasVotedForRequestId[msg.sender][requestId], "Only if not voted yet");
        _;

        hasVotedForRequestId[msg.sender][requestId] = true;
    }

    modifier onlyBeforeDeadline(uint256 requestId) {
        require(approvalRequests[requestId].deadlineTimestamp > block.timestamp,
            "Only before deadline is reached");
        _;
    }

    modifier onlyEnoughStaked() {
        require(staking.balanceOf(msg.sender) >= amountStakedForDaoMembership,
            "Only enough staked to subscribe for Dao Membership");
        _;
    }

    modifier onlyAfterDeadlineAndNotApproved(uint256 requestId) {
        require(approvalRequests[requestId].deadlineTimestamp <= block.timestamp,
            "Only after deadline is reached");
        require(!approvalRequests[requestId].isApproved, "Only if not already approved");
        _;
    }

    struct ApprovalRequest {
        uint256 loanId; // The loan id for which approcal is requested.
        bool isMilestone; // true if approval reuested is connected to a milestone and false if not.
        uint256 milestoneNumber; // The milestone number if is Milestone based request.
        uint256 deadlineTimestamp; // The deadline timestamp to approve this request.
        uint256 approvalsProvided; // The number of approvals that this request has gathered.
        bool isApproved; // True if request is approved, false if not.
    }

    mapping(address => mapping(uint256 => bool)) public isEpochDaoMember;
    mapping(address => mapping(uint256 => bool)) public isEpochDaoDelegator;
    mapping(address => mapping(uint256 => bool)) public hasVotedForRequestId;
    mapping(uint256 => uint256) public amountOfEpochDaoMembersNeededPerEpoch;
    mapping(uint256 => uint256) public amountOfEpochDaoDelegatorsNeededPerEpoch;

    mapping(address => uint256) public subscribedForDaoMembership;
    mapping(address => uint256) public subscribedForDaoDelegator;

    ValuedDoubleLinkedList.LinkedList private daoMembersListForCurrentEpoch;
    ValuedDoubleLinkedList.LinkedList private daoDelegatorsListForCurrentEpoch;
    ValuedDoubleLinkedList.LinkedList private daoMembersListForUpcomingEpoch;
    ValuedDoubleLinkedList.LinkedList private daoDelegatorsListForUpcomingEpoch;

    mapping(address => mapping(uint256 => bool)) public hasVotedForDaoMemberPerEpoch;
    mapping(address => mapping(uint256 => bool)) public hasVotedForDaoDelegatorPerEpoch;
    mapping(address => mapping(uint256 => bool)) public hasApprovedForDaoDelegatorPerEpoch;

    mapping(address => mapping(uint256 => bool)) public votingHashOfDaoMembersPerEpoch;

    mapping(address => uint256) public addressToId;
    mapping(uint256 => address) public idToAddress;

    uint256 public totalApprovalRequests; // The total amount of approvals requested.
    uint256 public approvalsNeeded; // The number of approvals needed for a request to pass.

    address public superDelegator;

    mapping(uint256 => ApprovalRequest) public approvalRequests;
    uint256 public loanApprovalRequestDuration;
    uint256 public milestoneApprovalRequestDuration;
    uint256 public amountStakedForDaoMemberSubscription;
    uint256 public amountStakedForDelegatorSubscription;

    IRegistry public registry;
    IStaking public staking;

    bool public openedDaoMembershipSubscriptions;
    bool public openedDaoMembershipVoting;
    bool public openedDaoDelegatorsSubscriptions;
    bool public openedDaoDelegatorsVoting;

    uint256 public amountOfDaoMembers;
    uint256 public amountOfDaoDelegators;

    uint256 public totalIds;
    uint256 public currentEpoch;
}
