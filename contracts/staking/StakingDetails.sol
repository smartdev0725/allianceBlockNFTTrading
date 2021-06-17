// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StakingTypesAndStorage.sol";

/**
 * @title Alliance Block Staking Details
 * @dev Extends StakingTypesAndStorage
 */
contract StakingDetails is StakingTypesAndStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Withdraw
     * @param staker_ the address of the staker
     * @param amount_ the amount of ALBT to withdraw
     */
    function _withdraw(address staker_, uint256 amount_) internal {
        totalSupply = totalSupply.sub(amount_);
        balance[staker_] = balance[staker_].sub(amount_);
        albt.safeTransfer(staker_, amount_);
        emit Withdrawn(staker_, amount_);
    }

    /**
     * @notice Stake
     * @param staker_ the address of the staker
     * @param amount_ the amount of ALBT to withdraw
     */
    function _stake(address staker_, uint256 amount_) internal {
        albt.safeTransferFrom(staker_, address(this), amount_);
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
     * @return stakerLvl3Amount Staker lvl 3 Amount
     */
    function getAmountsToStake()
        external
        view
        returns (
            uint256 stakerLvl1Amount,
            uint256 stakerLvl2Amount,
            uint256 stakerLvl3Amount
        )
    {
        stakerLvl1Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_1)];
        stakerLvl2Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_2)];
        stakerLvl3Amount = stakingTypeAmounts[uint256(StakingType.STAKER_LVL_3)];
    }
}
