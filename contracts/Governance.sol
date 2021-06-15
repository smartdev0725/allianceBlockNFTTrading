// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "./governance/SuperGovernance.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

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
     * @param lateApplicationsForInvestmentDuration_ duration forlate applications for investment
     */
    function initialize(
        address superDelegator_,
        uint256 applicationsForInvestmentDuration_,
        uint256 lateApplicationsForInvestmentDuration_
    ) public initializer {
        __Ownable_init();

        superDelegator = superDelegator_;

        updatableVariables[
            keccak256(abi.encode("applicationsForInvestmentDuration"))
        ] = applicationsForInvestmentDuration_;
        updatableVariables[
            keccak256(abi.encode("lateApplicationsForInvestmentDuration"))
        ] = lateApplicationsForInvestmentDuration_;
    }

    /**
     * @notice Request a investment or investment approval
     * @dev Executes cronJob()
     * @param investmentId The id of the investment or investment to approve
     */
    function requestApproval(
        uint256 investmentId
    ) external onlyRegistry() checkCronjob() {
        approvalRequests[totalApprovalRequests].investmentId = investmentId;

        emit ApprovalRequested(
            approvalRequests[totalApprovalRequests].investmentId,
            msg.sender
        );

        totalApprovalRequests = totalApprovalRequests.add(1);
    }

    /**
     * @notice Stores Investment Duration
     * @dev Adds cronJob
     * @param investmentId The id of the investment to store
     */
    function storeInvestmentTriggering(uint256 investmentId) external onlyRegistry() {
        uint256 nextCronjobTimestamp =
            block.timestamp.add(updatableVariables[keccak256(abi.encode("applicationsForInvestmentDuration"))]);
        addCronjob(CronjobType.INVESTMENT, nextCronjobTimestamp, investmentId);
    }
}
