// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "./governance/DaoSubscriptions.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IStaking.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract Governance is DaoSubscriptions {
    using SafeMath for uint256;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    /**
     * @dev Constructor of the contract.
     */
    constructor(
        address superDelegator_,
        uint256 loanApprovalRequestDuration_,
        uint256 milestoneApprovalRequestDuration_,
        uint256 daoUpdateRequestDuration_,
        uint256 approvalsNeededForRegistryRequest_,
        uint256 approvalsNeededForGovernanceRequest_
    )
    public
    {
        superDelegator = superDelegator_;

        updatableVariables[keccak256(abi.encode("loanApprovalRequestDuration"))] = loanApprovalRequestDuration_;
        updatableVariables[keccak256(abi.encode("milestoneApprovalRequestDuration"))] = milestoneApprovalRequestDuration_;
        updatableVariables[keccak256(abi.encode("daoUpdateRequestDuration"))] = daoUpdateRequestDuration_;
        updatableVariables[keccak256(abi.encode("approvalsNeededForRegistryRequest"))] = approvalsNeededForRegistryRequest_;
        updatableVariables[keccak256(abi.encode("approvalsNeededForGovernanceRequest"))] = approvalsNeededForGovernanceRequest_;
    }

    function requestApproval(
    	uint256 loanId,
        bool isMilestone,
        uint256 milestoneNumber
    )
    external
    onlyRegistry()
    checkCronjob()
    {
        approvalRequests[totalApprovalRequests].loanId = loanId;
        approvalRequests[totalApprovalRequests].isMilestone = isMilestone;
        approvalRequests[totalApprovalRequests].epochSubmitted = currentEpoch;

        if (isMilestone) {
            approvalRequests[totalApprovalRequests].milestoneNumber = milestoneNumber;
            approvalRequests[totalApprovalRequests].deadlineTimestamp =
                block.timestamp.add(updatableVariables[keccak256(abi.encode("milestoneApprovalRequestDuration"))]);
        } else {            
            approvalRequests[totalApprovalRequests].deadlineTimestamp =
                block.timestamp.add(updatableVariables[keccak256(abi.encode("loanApprovalRequestDuration"))]);
        }

        if (currentEpoch > 1) {
            addCronjob(
                CronjobType.DAO_APPROVAL,
                approvalRequests[totalApprovalRequests].deadlineTimestamp,
                totalApprovalRequests
            );

            requestsPerEpoch[currentEpoch].addNode(totalApprovalRequests);

            if (epochDaoDelegators[currentEpoch].getSize() > 0) {
                epochDaoDelegators[currentEpoch].cloneList(remainingDelegatorIdsToVotePerRequest[totalApprovalRequests]);
            }
        }

        emit ApprovalRequested(
            approvalRequests[totalApprovalRequests].loanId,
            approvalRequests[totalApprovalRequests].isMilestone,
            approvalRequests[totalApprovalRequests].milestoneNumber,
            msg.sender
        );

        totalApprovalRequests = totalApprovalRequests.add(1);
    }

    function voteForRequest(
        uint256 requestId,
        bool decision
    )
    external
    onlyDaoDelegatorNotVoted(requestId, approvalRequests[requestId].epochSubmitted)
    onlyBeforeDeadline(requestId)
    checkCronjob()
    {
        if (decision) {
            approvalRequests[requestId].approvalsProvided = approvalRequests[requestId].approvalsProvided.add(1);
        }

        remainingDelegatorIdsToVotePerRequest[requestId].removeNode(addressToId[msg.sender]);

        emit VotedForRequest(approvalRequests[requestId].loanId, requestId, decision, msg.sender);
    }

    /**
    * @dev Helper function for querying Governance variables
    * @return internal Governance uint variables
    */
    function getDaoData() public view returns (uint256, uint256, uint256, uint256, uint256){
        (, uint256 amountToStakeForDaoMember, ) = staking.getAmountsToStake();

        return (
            totalApprovalRequests,
            updatableVariables[keccak256(abi.encode("approvalsNeededForRegistryRequest"))],
            updatableVariables[keccak256(abi.encode("loanApprovalRequestDuration"))],
            updatableVariables[keccak256(abi.encode("milestoneApprovalRequestDuration"))],
            amountToStakeForDaoMember
        );
    }
}
