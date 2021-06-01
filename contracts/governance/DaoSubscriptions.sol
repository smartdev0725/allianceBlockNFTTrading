// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "./SuperGovernance.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title AllianceBlock DaoSubscriptions contract
 * @dev Extends SuperGovernance
 * @notice Responsible for all dao subscriptions on AllianceBlock's ecosystem
*/
contract DaoSubscriptions is SuperGovernance {
    using SafeMath for uint256;
    using ValuedDoubleLinkedList for ValuedDoubleLinkedList.LinkedList;
    using DoubleLinkedList for DoubleLinkedList.LinkedList;

    /**
     * @notice Subscribe to become DAO Member Subscriber
     * @dev Executes cronJob()
     * @dev requires closed subscription
    */
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

    /**
     * @notice Unsubscribe from become DAO Member Subscription
     * @dev Executes cronJob()
     * @dev requires msg.sender not being Active DAO Member
    */
    function unsubscribeDaoMembership()
    external
    checkCronjob()
    {
        require(!isEpochDaoMember[msg.sender][currentEpoch], "Cannot unsubscribe while being active dao member");

        subscribedForDaoMembership[msg.sender] = false;
        staking.unstakeDao(msg.sender, true);
    }

    /**
     * @notice Vote from becoming DAO Member
     * @dev Executes cronJob()
     * @dev requires open Membership voting
     * @dev requires msg.sender to be staker and DAO Membership Subscriber
     * @dev requires single vote per epoch
     * @param daoSubscriberToVoteFor The address of the voted DAO Member Subscriber
    */
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

    /**
     * @notice Claim DAO Membership to become Active DAO Member
     * @dev Executes cronJob()
     * @dev requires msg.sender open DAO Membership and elligible DAO Member
    */
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

    /**
     * @notice Subscribe to become DAO Delegator Subscriptor
     * @dev Executes cronJob()
     * @dev requires msg.sender to be DAO Member
    */
    function subscribeForDaoDelegator()
    external
    checkCronjob()
    {
        require(isEpochDaoMember[msg.sender][currentEpoch], "Only active dao members can subscribe to become delegators");

        staking.provideStakingForDaoDelegator(msg.sender);
        subscribedForDaoDelegator[msg.sender] = true;
    }

    /**
     * @notice Unsubscribe from DAO Delegator Subscription
     * @dev Executes cronJob()
     * @dev requires msg.sender not to be Active DAO Delegator
    */
    function unsubscribeDaoDelegation()
    external
    checkCronjob()
    {
        require(!isEpochDaoDelegator[msg.sender][currentEpoch], "Cannot unsubscribe while being active dao delegator");

        subscribedForDaoDelegator[msg.sender] = false;
        staking.unstakeDao(msg.sender, false);
    }

    /**
     * @notice Vote from becoming a DAO Delegator Subscription
     * @dev Executes cronJob()
     * @dev requires open voting for DAO Delegators
     * @dev requires msg.sender to be Active DAO Member and only vote once per epoch
     * @param votingHash the actual vote casted
    */
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

    /**
     * @notice Approves vote for DAO Delegator
     * @dev Executes cronJob()
     * @dev requires voting approval to be open
     * @dev msg.sender to send the right password and only one vote per epoch
     * @dev vote to be casted for Active DAO Member
     * @param password password for the secret vote
     * @param daoDelegatorToVoteFor the delegator to vote for
    */
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

    /**
     * @notice Claim DAO Delegator
     * @dev Executes cronJob()
     * @dev requires Claiming DAO Delegation to be open
     * @dev requires to be the next in line for becoming DAO Delegator
    */
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

    /**
     * @notice Claim DAO Substitute Delegator
     * @dev Executes cronJob()
     * @dev requires DAO Substitute Delegators to be requested
     * @dev requires to be the next in line for becoming substitute
    */
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

    /**
     * @notice check DAO Associated values
     * @dev used to check pertenence of member to DAO
     * @param account the account to check
     * @param epoch the epoch to check
     * @return (isDaoMember?, isDaoDelegator?,epoch of Dao Member, epoch of Dao Delegator)
    */
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
