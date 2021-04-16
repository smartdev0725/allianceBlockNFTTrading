// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "./governance/SuperGovernance.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IStaking.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract Governance is SuperGovernance {
    using SafeMath for uint256;

    /**
     * @dev Constructor of the contract.
     * @param lendingToken_ The token that lenders will be able to lend.
     * @param mainNFT_ The ERC721 token contract which will represent the whole loans.
     * @param loanNFT_ The ERC1155 token contract which will represent the lending amounts.
     */
    constructor(
        address superDelegator_,
        uint256 loanApprovalRequestDuration_,
        uint256 milestoneApprovalRequestDuration_,
        uint256 amountStakedForDaoMemberSubscription_,
        uint256 amountStakedForDelegatorSubscription_
    )
    public
    {
        superDelegator = superDelegator_;

        loanApprovalRequestDuration = loanApprovalRequestDuration_;
        milestoneApprovalRequestDuration = milestoneApprovalRequestDuration_;
        amountStakedForDaoMembership = amountStakedForDaoMembership_;
        amountStakedForDelegatorSubscription = amountStakedForDelegatorSubscription_;
    }

    function requestApproval(
    	uint256 loanId,
        bool isMilestone,
        uint256 milestoneNumber
    )
    external
    onlyRegistry()
    {
        approvalRequests[totalApprovalRequests].loanId = loanId;
        approvalRequests[totalApprovalRequests].isMilestone = isMilestone;

        if(isMilestone) {
            approvalRequests[totalApprovalRequests].milestoneNumber = milestoneNumber;
            approvalRequests[totalApprovalRequests].deadlineTimestamp = block.timestamp.add(milestoneApprovalRequestDuration);
        } else {            
            approvalRequests[totalApprovalRequests].deadlineTimestamp = block.timestamp.add(loanApprovalRequestDuration);
        }

        totalApprovalRequests = totalApprovalRequests.add(1);
    }

    function voteForRequest(
        uint256 requestId,
        bool decision
    )
    external
    onlyDaoDelegatorNotVoted(requestId)
    onlyBeforeDeadline(requestId)
    {
        if(decision)
            approvalRequests[requestId].approvalsProvided = approvalRequests[requestId].approvalsProvided.add(1);

        if(approvalRequests[requestId].approvalsProvided == approvalsNeeded) {
            if(approvalRequests[requestId].isMilestone) {
                registry.decideForMilestone(approvalRequests[requestId].loanId, true);
            } else {                
                registry.decideForLoan(approvalRequests[requestId].loanId, true);
            }

            approvalRequests[requestId].isApproved = true;
        }
    }

    function challengeRequest(
        uint256 requestId
    )
    external
    onlyAfterDeadlineAndNotApproved(requestId)
    {
        if(approvalRequests[requestId].isMilestone) {
            registry.decideForMilestone(approvalRequests[requestId].loanId, false);
        } else {                
            registry.decideForLoan(approvalRequests[requestId].loanId, false);
        }        
    }

    function subscribeForDaoMembership()
    external
    {
        require(openedDaoMembershipSubscriptions, "Subscriptions for Dao Membership are not open yet");

        staking.provideStakingForDaoMembership(msg.sender);
        subscribedForDaoMembership[msg.sender] = true;

        if(addressToId[msg.sender] == 0) {
            totalIds = totalIds.add(1);
            addressToId[msg.sender] = totalIds;
            idToAddress[totalIds] = msg.sender;
        }
    }

    // TODO - Add unsubscribe

    function voteForDaoMember(address daoSubscriberToVoteFor)
    external
    {
        require(staking.balance(msg.sender) > 0, "Only stakers can vote");
        require(subscribedForDaoMembership[daoSubscriberToVoteFor], "Can only vote for active dao membership subscriber");
        require(!hasVotedForDaoMemberPerEpoch[msg.sender][currentEpoch], "Cannot vote again");
        // TODO - require voting to be active

        hasVotedForDaoMemberPerEpoch[msg.sender][currentEpoch] = true;

        uint256 votesForSubscriber = daoMembersListForUpcomingEpoch.nodes[addressToId[daoSubscriberToVoteFor]].value;

        if(votesForSubscriber != 0) {
            daoMembersListForUpcomingEpoch.removeNode(addressToId[daoSubscriberToVoteFor]);
        }

        daoMembersListForUpcomingEpoch.addNodeDecrement(votesForSubscriber.add(1), addressToId[daoSubscriberToVoteFor]);
    }
    // TODO - Add three states and functions to change between them (VOTING - CLAIM_MEMBERSHIP - LATE_MEMBERSHIP_CLAIMING)

    function claimDaoMembership()
    external
    {
        // TODO - require claiming to be active
        require(daoMembersListForUpcomingEpoch.getPositionForId(addressToId[msg.sender]) <=
            amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)], "Not eligible to become dao member");

        daoMembersListForUpcomingEpoch.removeNode(addressToId[msg.sender]);
        amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)] = amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)].sub(1);
    }

    function subscribeForDaoDelegator()
    external
    {
        require(openedDaoDelegatorsSubscriptions, "Subscriptions for Dao Delegators are not open yet");

        staking.provideStakingForDaoDelegator(msg.sender);
        subscribedForDaoDelegator[msg.sender] = true;
    }

    // TODO - Add unsubscribe

    function voteForDaoDelegator(bytes32 votingHash)
    external
    {
        require(isEpochDaoMember[msg.sender][currentEpoch], "Only dao members can vote");
        require(!hasVotedForDaoDelegatorPerEpoch[msg.sender][currentEpoch], "Cannot vote again");
        // TODO - require voting to be active

        hasVotedForDaoDelegatorPerEpoch[msg.sender][currentEpoch] = true;

        votingHashOfDaoMembersPerEpoch[msg.sender][currentEpoch] = votingHash;
    }

    function approveVoteForDaoDelegator(string password, address daoDelegatorToVoteFor)
    external
    {
        require(votingHashOfDaoMembersPerEpoch[msg.sender][currentEpoch] ==
            keccak256(abi.encodePacked(password, daoDelegatorToVoteFor)), "Wrong approval password or delegator");
        require(subscribedForDaoDelegator[daoDelegatorToVoteFor], "Can only vote for active dao delegator subscriber");
        require(!hasApprovedForDaoDelegatorPerEpoch[msg.sender][currentEpoch], "Cannot approve vote again");
        // TODO - require voting approval to be active

        hasApprovedForDaoDelegatorPerEpoch[msg.sender][currentEpoch] = true;

        uint256 votesForSubscriber = daoDelegatorsListForUpcomingEpoch.nodes[addressToId[daoDelegatorToVoteFor]].value;

        if(votesForSubscriber != 0) {
            daoDelegatorsListForUpcomingEpoch.removeNode(addressToId[daoDelegatorToVoteFor]);
        }

        daoDelegatorsListForUpcomingEpoch.addNodeDecrement(votesForSubscriber.add(1), addressToId[daoDelegatorToVoteFor]);
    }

    function isDaoAssociated(address account, uint256 epoch)
    external
    view
    returns(bool, bool, uint256, uint256)
    {
        return (
            isEpochDaoMember[account][epoch],
            isEpochDaoDelegator[account][epoch],
            amountOfEpochDaoMembers[epoch],
            amountOfEpochDaoDelegators[epoch]
        );
    }
}
