// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./DaoCronjob.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev Extends OwnableUpgradeable, DaoCronjob
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract SuperGovernance is Initializable, OwnableUpgradeable, DaoCronjob, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;

    function __SuperGovernance_init() public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        projectCont = 1;
    }

    /**
     * @notice Sets investment contract
     * @dev used to initialize SuperGovernance
     * @dev requires not already initialized
     * @param projectAddress_ the investment address
     */
    function setProject(address projectAddress_) external onlyOwner() {
        require(projectAddress_ != address(0), "Cannot initialize with 0 addresses");
        require(projectTypesIndex[projectAddress_] == 0, "Cannot initialize second time");
        projectTypesIndex[projectAddress_] = projectCont;
        projects[projectCont] = projectAddress_;
        projectCont += 1;

        emit InitGovernance(projectAddress_, msg.sender);
    }

    /**
     * @notice Votes for Request
     * @dev Executes cronJob
     * @dev requires msg.sender to be Super Delegator
     * @dev requires current epoch to be 0 or 1
     * @param requestId the Request ID
     * @param decision the decision (Approve / Deny)
     */
    function superVoteForRequest(uint256 requestId, bool decision) external checkCronjob() nonReentrant() {
        require(msg.sender == superDelegator, "Only super delegator can call this function");
        require(!approvalRequests[requestId].isProcessed, "Cannot process again same investment");

        IProject(projects[approvalRequests[requestId].projectType]).decideForProject(projectId, decision);

        if (decision) {
            approvalRequests[requestId].approvalsProvided = 1;
            approvalRequests[requestId].isApproved = true;
        }

        approvalRequests[requestId].isProcessed = true;

        emit VotedForRequest(approvalRequests[requestId].projectType, projectId, decision, msg.sender);
    }
}
