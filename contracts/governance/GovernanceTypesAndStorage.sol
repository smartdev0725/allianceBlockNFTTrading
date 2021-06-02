// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

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

    struct ApprovalRequest {
        uint256 loanId; // The loan id for which approcal is requested.
        bool isMilestone; // true if approval reuested is connected to a milestone and false if not.
        uint256 milestoneNumber; // The milestone number if is Milestone based request.
        uint256 deadlineTimestamp; // The deadline timestamp to approve this request.
        uint256 approvalsProvided; // The number of approvals that this request has gathered.
        bool isApproved; // True if request is approved, false if not.
        uint256 epochSubmitted; // The epoch that the request was submitted.
    }

    // EVENTS
    event VotedForRequest(uint indexed loanId, uint indexed requestId, bool decision, address indexed user);
    event ApprovalRequested(uint indexed loanId, bool indexed isMilestone, uint milestoneNumber, address indexed user);
    event InitGovernance(address indexed registryAddress_, address indexed stakingAddress_, address indexed user);

    uint256 public totalApprovalRequests; // The total amount of approvals requested.

    address public superDelegator;

    mapping(uint256 => ApprovalRequest) public approvalRequests;

    IRegistry public registry;
    IStaking public staking;

    uint256 public totalIds;

    mapping(bytes32 => uint256) public updatableVariables;

    // CRONJOB types and variables
    enum CronjobType {
        DAO_APPROVAL, // Cronjob type for approvals on registry requests.
        INVESTMENT // Cronjob type for users to show interest for an investment.
    }

    struct Cronjob {
        CronjobType cronjobType; // This is the cronjob type.
        uint256 externalId; // This is the id of the request in case of dao approval, change voting request or investment.
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
