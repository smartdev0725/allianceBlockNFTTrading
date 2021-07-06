// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

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
    }

    /**
     * @notice Sets Registry contract
     * @dev used to initialize SuperGovernance
     * @dev requires not already initialized
     * @param registryAddress_ the Registry address
     */
    function setRegistry(address registryAddress_) external onlyOwner() {
        require(registryAddress_ != address(0), "Cannot initialize with 0 addresses");
        require(address(registry) == address(0), "Cannot initialize second time");
        registry = IRegistry(registryAddress_);

        emit InitGovernance(registryAddress_, msg.sender);
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
        require(approvalRequests[requestId].approvalsProvided == 0, "Cannot approve again same investment");

        registry.decideForInvestment(approvalRequests[requestId].investmentId, decision);

        if (decision) {
            approvalRequests[requestId].approvalsProvided = 1;
            approvalRequests[requestId].isApproved = true;
        }

        emit VotedForRequest(approvalRequests[requestId].investmentId, requestId, decision, msg.sender);
    }
}
