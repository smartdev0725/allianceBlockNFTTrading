// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "./SuperGovernance.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title AllianceBlock DaoSubscriptions contract
 * @notice Responsible for all dao subscriptions on AllianceBlock's ecosystem
 */
contract DaoSubscriptions is SuperGovernance {
    using SafeMath for uint256;
    using ValuedDoubleLinkedList for ValuedDoubleLinkedList.LinkedList;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    function subscribeForDaoMembership()
    external
    checkCronjob()
    {
        require(votingStatusForDaoMembers > VotingStatusMembers.EMPTY_STATE, "Subscriptions for Dao Membership are not open right now");

        staking.provideStakingForDaoMembership(msg.sender);
        subscribedForDaoMembership[msg.sender] = true;

        if(addressToId[msg.sender] == 0) {
            totalIds = totalIds.add(1);
            addressToId[msg.sender] = totalIds;
            idToAddress[totalIds] = msg.sender;
        }
    }

    function unsubscribeDaoMembership()
    external
    checkCronjob()
    {
        require(!isEpochDaoMember[msg.sender][currentEpoch], "Cannot unsubscribe while being active dao member");

        subscribedForDaoMembership[msg.sender] = false;
        staking.unstakeDao(msg.sender, true);
    }

    function voteForDaoMember(address daoSubscriberToVoteFor)
    external
    checkCronjob()
    {
        require(votingStatusForDaoMembers == VotingStatusMembers.VOTING, "Voting for Dao Members is not open right now");
        require(staking.getBalance(msg.sender) > 0, "Only stakers can vote");
        require(subscribedForDaoMembership[daoSubscriberToVoteFor], "Can only vote for active dao membership subscriber");
        require(!hasVotedForDaoMemberPerEpoch[msg.sender][currentEpoch], "Cannot vote again");

        hasVotedForDaoMemberPerEpoch[msg.sender][currentEpoch] = true;

        uint256 votesForSubscriber = daoMembersListForUpcomingEpoch.nodes[addressToId[daoSubscriberToVoteFor]].value;

        if(votesForSubscriber != 0) {
            daoMembersListForUpcomingEpoch.removeNode(addressToId[daoSubscriberToVoteFor]);
        }

        daoMembersListForUpcomingEpoch.addNodeDecrement(votesForSubscriber.add(1), addressToId[daoSubscriberToVoteFor]);
    }

    function claimDaoMembership()
    external
    checkCronjob()
    {
        require(votingStatusForDaoMembers >= VotingStatusMembers.CLAIM_MEMBERSHIP, "Claiming Dao Membership is not open right now");
        uint256 currentPosition = daoMembersListForUpcomingEpoch.getPositionForId(addressToId[msg.sender]);

        require(currentPosition > 0 && currentPosition <=
            amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)], "Not eligible to become dao member");

        daoMembersListForUpcomingEpoch.removeNode(addressToId[msg.sender]);
        amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)] =
            amountOfEpochDaoMembersNeededPerEpoch[currentEpoch.add(1)].sub(1);
        isEpochDaoMember[msg.sender][currentEpoch.add(1)] = true;

        epochDaoMembers[currentEpoch.add(1)].addNode(addressToId[msg.sender]);
    }

    function subscribeForDaoDelegator()
    external
    checkCronjob()
    {
        require(isEpochDaoMember[msg.sender][currentEpoch], "Only active dao members can subscribe to become delegators");

        staking.provideStakingForDaoDelegator(msg.sender);
        subscribedForDaoDelegator[msg.sender] = true;
    }

    function unsubscribeDaoDelegation()
    external
    checkCronjob()
    {
        require(!isEpochDaoDelegator[msg.sender][currentEpoch], "Cannot unsubscribe while being active dao delegator");

        subscribedForDaoDelegator[msg.sender] = false;
        staking.unstakeDao(msg.sender, false);
    }

    function voteForDaoDelegator(bytes32 votingHash)
    external
    checkCronjob()
    {
        require(votingStatusForDaoDelegators == VotingStatusDelegators.VOTING, "Voting for Dao Delegators is not open right now");
        require(isEpochDaoMember[msg.sender][currentEpoch], "Only dao members can vote");
        require(!hasVotedForDaoDelegatorPerEpoch[msg.sender][currentEpoch], "Cannot vote again");

        hasVotedForDaoDelegatorPerEpoch[msg.sender][currentEpoch] = true;

        votingHashOfDaoMembersPerEpoch[msg.sender][currentEpoch] = votingHash;
    }

    function approveVoteForDaoDelegator(string calldata password, address daoDelegatorToVoteFor)
    external
    checkCronjob()
    {
        require(votingStatusForDaoDelegators == VotingStatusDelegators.APPROVE_VOTING, "Approve voting for Dao Delegators is not open right now");
        require(votingHashOfDaoMembersPerEpoch[msg.sender][currentEpoch] ==
            keccak256(abi.encodePacked(password, daoDelegatorToVoteFor)), "Wrong approval password or delegator");
        require(subscribedForDaoDelegator[daoDelegatorToVoteFor], "Can only vote for active dao delegator subscriber");
        require(isEpochDaoMember[daoDelegatorToVoteFor][currentEpoch], "Can only vote delegator that is active dao member");
        require(!hasApprovedForDaoDelegatorPerEpoch[msg.sender][currentEpoch], "Cannot approve vote again");

        hasApprovedForDaoDelegatorPerEpoch[msg.sender][currentEpoch] = true;

        if (!bannedDelegator[addressToId[daoDelegatorToVoteFor]][currentEpoch.add(1)]) {
            uint256 votesForSubscriber = daoDelegatorsListForUpcomingEpoch.nodes[addressToId[daoDelegatorToVoteFor]].value;

            if(votesForSubscriber != 0) {
                daoDelegatorsListForUpcomingEpoch.removeNode(addressToId[daoDelegatorToVoteFor]);
            }

            daoDelegatorsListForUpcomingEpoch.addNodeDecrement(votesForSubscriber.add(1), addressToId[daoDelegatorToVoteFor]);
        }
    }

    function claimDaoDelegation()
    external
    checkCronjob()
    {
        require(votingStatusForDaoDelegators >= VotingStatusDelegators.CLAIM_DELEGATION, "Claiming Dao Delegation is not open right now");
        uint256 currentPosition = daoDelegatorsListForUpcomingEpoch.getPositionForId(addressToId[msg.sender]);

        require(currentPosition > 0 && currentPosition <=
            amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch.add(1)], "Not eligible to become dao delegator");

        daoDelegatorsListForUpcomingEpoch.removeNode(addressToId[msg.sender]);
        amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch.add(1)] =
            amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch.add(1)].sub(1);

        isEpochDaoDelegator[msg.sender][currentEpoch.add(1)] = true;

        epochDaoDelegators[currentEpoch.add(1)].addNode(addressToId[msg.sender]);
    }

    function claimDaoSubstituteDelegation()
    external
    checkCronjob()
    {
        require(amountOfSubstitutesRequested[currentEpoch] > 0, "No substitutes requested");
        uint256 currentPosition = daoSubstituteDelegatorsListForCurrentEpoch.getPositionForId(addressToId[msg.sender]);

        require(currentPosition > 0 && currentPosition <=
            amountOfEpochDaoDelegatorsNeededPerEpoch[currentEpoch], "Not eligible to become dao delegator substitute");

        amountOfSubstitutesRequested[currentEpoch] = amountOfSubstitutesRequested[currentEpoch].sub(1);
        epochDaoDelegators[currentEpoch].addNode(addressToId[msg.sender]);
        isEpochDaoDelegator[msg.sender][currentEpoch] = true;

        addSubstituteToAllActiveRequests(addressToId[msg.sender], currentEpoch);
    }

    function isDaoAssociated(address account, uint256 epoch)
    external
    view
    returns(bool, bool, uint256, uint256)
    {
        return (
            isEpochDaoMember[account][epoch],
            isEpochDaoDelegator[account][epoch],
            epochDaoMembers[epoch].getSize(),
            epochDaoDelegators[epoch].getSize()
        );
    }
}
