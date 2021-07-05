// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../interfaces/IRegistry.sol";
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
        uint256 investmentId; // The investment id for which approcal is requested.
        uint256 approvalsProvided; // The number of approvals that this request has gathered.
        bool isApproved; // True if request is approved, false if not.
    }

    // EVENTS
    event VotedForRequest(uint256 indexed investmentId, uint256 indexed requestId, bool decision, address indexed user);
    event ApprovalRequested(
        uint256 indexed investmentId,
        address indexed user
    );
    event InitGovernance(address indexed registryAddress_, address indexed user);

    uint256 public totalApprovalRequests; // The total amount of approvals requested.

    address public superDelegator;

    mapping(uint256 => ApprovalRequest) public approvalRequests;

    IRegistry public registry;

    uint256 public totalIds;

    mapping(bytes32 => uint256) public updatableVariables;

    // CRONJOB types and variables
    enum CronjobType {
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
}
