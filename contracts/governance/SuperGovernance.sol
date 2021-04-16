// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "./GovernanceStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IStaking.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract SuperGovernance is Ownable, GovernanceStorage {
    function initialize(
        address registryAddress_,
        address stakingAddress_
    )
    external
    onlyOwner()
    {
        require(address(registry) == address(0), "Cannot initialize second time");
        registry = IRegistry(registryAddress_);
        staking = IStaking(stakingAddress_);
    }

    function superVoteForRequest(
        uint256 requestId,
        bool decision
    )
    external
    {
        require(msg.sender == superDelegator, "Only super delegator can call this function");

        if(approvalRequests[requestId].isMilestone) {
            registry.decideForMilestone(approvalRequests[requestId].loanId, decision);                
        } else {
            registry.decideForLoan(approvalRequests[requestId].loanId, decision);
        }

        if(decision) {
            approvalRequests[requestId].approvalsProvided = approvalRequests[requestId].approvalsProvided.add(1);
            approvalRequests[requestId].isApproved = true;
        }
    }

    function openDaoMembershipSubscriptions()
    external
    onlyOwner()
    {
        openedDaoMembershipSubscriptions = true;
    }

    function openDaoMembershipVoting()
    external
    onlyOwner()
    {
        openedDaoMembershipVoting = true;
    }

    function openDaoDelegatingSubscriptions(uint256 amountOfDaoMembers_)
    external
    onlyOwner()
    {
        amountOfDaoMembers = amountOfDaoMembers_;

        // TODO - State for dao members is going to claim membership
        amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)] = amountOfDaoMembers_;
        openedDaoMembershipVoting = true;
        openedDaoDelegatorsSubscriptions = true;
    }

    function openDaoDelegatingVoting()
    external
    onlyOwner()
    {
        openedDaoDelegatorsVoting = true;
    }
}
