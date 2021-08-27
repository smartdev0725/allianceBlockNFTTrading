// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../interfaces/IProject.sol";
import "../interfaces/IProjectManager.sol";
import "../libs/OrderedDoubleLinkedList.sol";

/**
 * @title AllianceBlock GovernanceStorage contract
 * @notice Responsible for governance storage
 */
contract GovernanceTypesAndStorage {
    bytes32 public constant APPLICATIONS_FOR_INVESTMENT_DURATION = keccak256("applicationsForInvestmentDuration");
    bytes32 public constant LATE_APPLICATIONS_FOR_INVESTMENT_DURATION =
        keccak256("lateApplicationsForInvestmentDuration");

    struct ApprovalRequest {
        uint256 projectId; // The investment id for which approcal is requested.
        uint256 approvalsProvided; // The number of approvals that this request has gathered.
        bool isApproved; // True if request was approved, false if not.
        bool isProcessed; // True if request was processed, false if not.
        uint256 createdDate; // The timestamp when the project was created
    }

    // EVENTS
    event VotedForRequest(uint256 indexed projectId, bool decision, address indexed user);
    event ApprovalRequested(uint256 indexed projectId, address indexed user);
    event InitGovernance(address indexed projectAddress_, address indexed user);

    uint256 public totalApprovalRequests; // The total amount of approvals requested.

    address public superDelegator;

    mapping(uint256 => ApprovalRequest) public approvalRequests;

    IProjectManager public projectManager;

    mapping(bytes32 => uint256) public updatableVariables;

    // CRONJOB types and variables
    enum CronjobType {
        INVESTMENT // Cronjob type for users to show interest for an investment.
    }

    struct Cronjob {
        CronjobType cronjobType; // This is the cronjob type.
        uint256 projectId; // This is the id of the request in case of dao approval, change voting request or investment.
    }

    // TODO - Make this simple linked list, not double (we don't need to remove anything else than head MAYBE).
    OrderedDoubleLinkedList.LinkedList public cronjobList;
    uint256 public totalCronjobs;

    mapping(uint256 => Cronjob) public cronjobs; // cronjobId to Cronjob.

    // MODIFIERS

    modifier onlyProject() {
        require(projectManager.isProject(msg.sender), "Only Project contract");
        _;
    }

    modifier onlySuperDelegator() {
        require(msg.sender == superDelegator, "Only super delegator can call this function");
        _;
    }
}
