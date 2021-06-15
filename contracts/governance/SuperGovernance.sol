// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "./DaoCronjob.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev Extends OwnableUpgradeable, DaoCronjob
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract SuperGovernance is OwnableUpgradeable, DaoCronjob {
    using SafeMath for uint256;

    /**
     * @notice Sets Registry and Staking contracts
     * @dev used to initialize SuperGovernance
     * @dev requires not already initialized
     * @param registryAddress_ the Registry address
     * @param stakingAddress_ the Stake address
     */
    function setRegistryAndStaking(address registryAddress_, address stakingAddress_) external onlyOwner() {
        require(address(registry) == address(0), "Cannot initialize second time");
        registry = IRegistry(registryAddress_);
        staking = IStaking(stakingAddress_);

        emit InitGovernance(registryAddress_, stakingAddress_, msg.sender);
    }

    /**
     * @notice Votes for Request
     * @dev Executes cronJob
     * @dev requires msg.sender to be Super Delegator
     * @dev requires current epoch to be 0 or 1
     * @param requestId the Request ID
     * @param decision the decision (Approve / Deny)
     */
    function superVoteForRequest(uint256 requestId, bool decision) external checkCronjob() {
        require(msg.sender == superDelegator, "Only super delegator can call this function");

        if (approvalRequests[requestId].isMilestone) {
            registry.decideForMilestone(approvalRequests[requestId].loanId, decision);
        } else {
            registry.decideForLoan(approvalRequests[requestId].loanId, decision);
        }

        if (decision) {
            approvalRequests[requestId].approvalsProvided = approvalRequests[requestId].approvalsProvided.add(1);
            approvalRequests[requestId].isApproved = true;
        }

        emit VotedForRequest(approvalRequests[requestId].loanId, requestId, decision, msg.sender);
    }
}
