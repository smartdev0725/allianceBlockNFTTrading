pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./StakingTypesAndStorage.sol";
import "hardhat/console.sol";

/**
 * @title Alliance Block DAO Staking Contract
 * @dev Extends StakingTypesAndStorage
*/
contract DaoStaking is StakingTypesAndStorage {
    using SafeMath for uint256;

    /**
     * @notice Provide Staking for DAO Membership
     * @param staker the address of the staker
    */
    function provideStakingForDaoMembership(address staker) external onlyGovernance() {
        uint256 amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)].sub(balance[staker]);

        freezed[staker] = true;

        _stake(staker, amount);
    }

    /**
     * @notice Provide Staking for DAO Delegators
     * @dev requires staker to be a DAO Member Subscriber
     * @param staker the address of the staker
    */
    function provideStakingForDaoDelegator(address staker) external onlyGovernance() {
        require(balance[staker] == stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)],
            "Must be already a dao member subscriber");

        uint256 amount = stakingTypeAmounts[uint256(StakingType.DAO_DELEGATOR)].sub(
            stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)]);

        _stake(staker, amount);
    }

    /**
     * @notice Unstake DAO
     * @param staker the address of the staker
     * @param isDaoMember whether or not the staker is a DAO Member
    */
    function unstakeDao(address staker, bool isDaoMember) external onlyGovernance() {
        freezed[staker] = false;

        if (!isDaoMember) _unstakeDaoDelegator(staker);
    }

    /**
     * @notice Provide Rewards
     * @param amountForDaoMembers the rewards for DAO Members
     * @param amountForDaoDelegators the rewards for DAO Delegators
     * @param epoch the current epoch
    */
    function provideRewards(
        uint256 amountForDaoMembers,
        uint256 amountForDaoDelegators,
        uint256 epoch
    )
    external
    onlyGovernance()
    {
        rewardsPerEpochForDaoMembers[epoch] = amountForDaoMembers;
        rewardsPerEpochForDaoDelegators[epoch] = amountForDaoDelegators;

        currentEpoch = epoch.add(1);
    }

    /**
     * @notice Withdraw Rewards for DAO Epoch
     * @dev requires epoch to be valid
     * @dev requires msg.sender to be a part of the DAO and not already withdrawn
     * @param staker the address of the staker
    */
    function withdrawRewardsForDaoEpoch(uint256 epoch) external {
        require(epoch < currentEpoch, "Can withdraw only for previous epoch");

        (bool isDaoMember, bool isDaoDelegator, uint256 amountOfDaoMembers, uint256 amountOfDaoDelegators) =
            governance.isDaoAssociated(msg.sender, epoch);
        require(isDaoMember || isDaoDelegator, "Should be part of the dao");

        require(!hasWithdrawn[msg.sender], "Already withdrawn");
        hasWithdrawn[msg.sender] = true;

        uint256 amountToWithdraw;

        if(isDaoMember) {
            amountToWithdraw = rewardsPerEpochForDaoMembers[epoch].div(amountOfDaoMembers);
        } else {
            amountToWithdraw = rewardsPerEpochForDaoDelegators[epoch].div(amountOfDaoDelegators);
        }

        _withdraw(msg.sender, amountToWithdraw);
    }

    /**
     * @notice Unstake DAO Delegator
     * @param staker the address of the staker
    */
    function _unstakeDaoDelegator(address staker_) internal {
        uint256 amount = stakingTypeAmounts[uint256(StakingType.DAO_DELEGATOR)].sub(
            stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)]);

        _withdraw(staker_, amount);
    }

    /**
     * @notice Withdraw
     * @param staker the address of the staker
     * @param amount the amount of ALBT to withdraw
    */
    function _withdraw(address staker_, uint256 amount_) internal {
        totalSupply = totalSupply.sub(amount_);
        balance[staker_] = balance[staker_].sub(amount_);
        albt.transfer(staker_, amount_);
    }

    /**
     * @notice Stake
     * @param staker the address of the staker
     * @param amount the amount of ALBT to withdraw
    */
    function _stake(address staker_, uint256 amount_) internal {
        albt.transferFrom(staker_, address(this), amount_);
        totalSupply = totalSupply.add(amount_);
        balance[staker_] = balance[staker_].add(amount_);
    }

    /**
     * @notice Get Balance
     * @dev Retrieves the staked balance for a given user
     * @param staker the address of the staker
    */
    function getBalance(address staker_) external view returns (uint256) {
        return balance[staker_];
    }

    /**
     * @notice Get Amounts to Stake
     * @return staker required amount per staking level
    */
    function getAmountsToStake() external view returns (
        uint256 stakerLvl1Amount,
        uint256 stakerLvl2Amount,
        uint256 stakerLvl3orDaoMemberAmount,
        uint256 daoDelegatorAmount
    ) {
        stakerLvl1Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_1)];
        stakerLvl2Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_2)];
        stakerLvl3orDaoMemberAmount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)];
        daoDelegatorAmount = stakingTypeAmounts[uint256(StakingType.DAO_DELEGATOR)];
    }
}
