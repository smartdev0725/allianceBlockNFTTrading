// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "../governance/DaoSubscriptions.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IRegistry.sol";
import "../interfaces/IStaking.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev WARNING Only for testing purposes, we added a couple of new methods and storage variables to check contract upgrade works fine
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract GovernanceV2 is Initializable, DaoSubscriptions {
    using SafeMath for uint256;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    uint256 public foo;
    uint256 public bar;

    /**
     * @dev Initialize the contract.
     */
    function initialize(
        address superDelegator_,
        uint256 loanApprovalRequestDuration_,
        uint256 milestoneApprovalRequestDuration_,
        uint256 daoUpdateRequestDuration_,
        uint256 approvalsNeededForRegistryRequest_,
        uint256 approvalsNeededForGovernanceRequest_,
        uint256 applicationsForInvestmentDuration_,
        uint256 lateApplicationsForInvestmentDuration_
    ) public initializer {
        __Ownable_init();

        superDelegator = superDelegator_;

        updatableVariables[keccak256(abi.encode("loanApprovalRequestDuration"))] = loanApprovalRequestDuration_;
        updatableVariables[keccak256(abi.encode("milestoneApprovalRequestDuration"))] = milestoneApprovalRequestDuration_;
        updatableVariables[keccak256(abi.encode("daoUpdateRequestDuration"))] = daoUpdateRequestDuration_;
        updatableVariables[keccak256(abi.encode("approvalsNeededForRegistryRequest"))] = approvalsNeededForRegistryRequest_;
        updatableVariables[keccak256(abi.encode("approvalsNeededForGovernanceRequest"))] = approvalsNeededForGovernanceRequest_;
        updatableVariables[keccak256(abi.encode("applicationsForInvestmentDuration"))] = applicationsForInvestmentDuration_;
        updatableVariables[keccak256(abi.encode("lateApplicationsForInvestmentDuration"))] = lateApplicationsForInvestmentDuration_;
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

    function storeInvestmentTriggering(
        uint256 investmentId
    )
    external
    onlyRegistry()
    {
        uint256 nextCronjobTimestamp = block.timestamp.add(
            updatableVariables[keccak256(abi.encode("applicationsForInvestmentDuration"))]);
        addCronjob(CronjobType.INVESTMENT, nextCronjobTimestamp, investmentId);
    }

    function getSomething1() public view returns (uint256) {
        return 1;
    }

    function getSomething2() public view returns (uint256) {
        return 2;
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
