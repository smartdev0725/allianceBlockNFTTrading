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
     * @notice Withdraw
     * @param staker_ the address of the staker
     * @param amount_ the amount of ALBT to withdraw
     */
    function _withdraw(address staker_, uint256 amount_) internal {
        totalSupply = totalSupply.sub(amount_);
        balance[staker_] = balance[staker_].sub(amount_);
        albt.transfer(staker_, amount_);
        emit Withdrawn(staker_, amount_);
    }

    /**
     * @notice Stake
     * @param staker_ the address of the staker
     * @param amount_ the amount of ALBT to withdraw
     */
    function _stake(address staker_, uint256 amount_) internal {
        albt.transferFrom(staker_, address(this), amount_);
        totalSupply = totalSupply.add(amount_);
        balance[staker_] = balance[staker_].add(amount_);
        emit Staked(staker_, amount_);
    }

    /**
     * @notice Get Balance
     * @dev Retrieves the staked balance for a given user
     * @param staker_ the address of the staker
     */
    function getBalance(address staker_) external view returns (uint256) {
        return balance[staker_];
    }

    /**
     * @notice Get Amounts to Stake
     * @return stakerLvl1Amount Staker lvl 1 Amount
     * @return stakerLvl2Amount Staker lvl 2 Amount
     * @return stakerLvl3orDaoMemberAmount Staker lvl 3 Amount Dao Member
     * @return daoDelegatorAmount Staker lvl 4 Amount (DAO Delegator)
     */
    function getAmountsToStake()
        external
        view
        returns (
            uint256 stakerLvl1Amount,
            uint256 stakerLvl2Amount,
            uint256 stakerLvl3orDaoMemberAmount,
            uint256 daoDelegatorAmount
        )
    {
        stakerLvl1Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_1)];
        stakerLvl2Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_2)];
        stakerLvl3orDaoMemberAmount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)];
        daoDelegatorAmount = stakingTypeAmounts[uint256(StakingType.DAO_DELEGATOR)];
    }
}
