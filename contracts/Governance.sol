// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./governance/SuperGovernance.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev Extends Initializable, SuperGovernance
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract Governance is Initializable, SuperGovernance {
    using SafeMath for uint256;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    /**
     * @notice Initialize the contract.
     * @param superDelegator_ The address of the admin in charge during the first epoch
     * @param applicationsForInvestmentDuration_ duration for applications for investment
     * @param lateApplicationsForInvestmentDuration_ duration for late applications for investment
     */
    function initialize(
        address superDelegator_,
        uint256 applicationsForInvestmentDuration_,
        uint256 lateApplicationsForInvestmentDuration_,
        address projectManager_
    ) external initializer {
        require(superDelegator_ != address(0), "Cannot initialize with 0 addresses");
        require(applicationsForInvestmentDuration_ != 0, "Cannot initialize applicationsForInvestmentDuration_ with 0");
        require(lateApplicationsForInvestmentDuration_ != 0, "Cannot initialize lateApplicationsForInvestmentDuration_ with 0");

        __SuperGovernance_init();
        
        projectManager = IProjectManager(projectManager_);
        superDelegator = superDelegator_;

        updatableVariables[APPLICATIONS_FOR_INVESTMENT_DURATION] = applicationsForInvestmentDuration_;
        updatableVariables[LATE_APPLICATIONS_FOR_INVESTMENT_DURATION] = lateApplicationsForInvestmentDuration_;
    }

    /**
     * @notice Update Superdelegator
     * @dev This function is used to update the superDelegator address.
     * @param superDelegator_ The address of the upgraded super delegator.
     */
    function updateSuperDelegator(address superDelegator_) external onlyOwner() {
        require(superDelegator_ != address(0), "Cannot initialize with 0 addresses");
        superDelegator = superDelegator_;
    }

    /**
     * @notice Request a investment or investment approval
     * @dev Executes cronJob()
     * @param projectId The id of the investment or investment to approve
     */
    function requestApproval(
        uint256 projectId
    ) external onlyProject() checkCronjob() nonReentrant() {
        approvalRequests[totalApprovalRequests].projectId = projectId;

        emit ApprovalRequested(
            approvalRequests[totalApprovalRequests].projectId,
            msg.sender
        );

        totalApprovalRequests = totalApprovalRequests.add(1);
    }

    /**
     * @notice Stores Investment Duration
     * @dev Adds cronJob
     * @param projectId The id of the investment to store
     */
    function storeInvestmentTriggering(uint256 projectId) external onlyProject() {
        uint256 nextCronjobTimestamp =
            block.timestamp.add(updatableVariables[APPLICATIONS_FOR_INVESTMENT_DURATION]);
        addCronjob(CronjobType.INVESTMENT, nextCronjobTimestamp, projectId);
    }
}
