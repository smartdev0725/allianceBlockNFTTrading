// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "../interfaces/IEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AllianceBlock StakingStorage contract
 * @notice Responsible for staking storage
 */
contract StakingTypesAndStorage {
    enum StakingType {STAKER_LVL_1, STAKER_LVL_2, STAKER_LVL_3}

    // ALBT token
    IERC20 public albt;
    IEscrow public escrow;

    uint256 public totalSupply;
    mapping(address => uint256) public balance;
    mapping(uint256 => uint256) public stakingTypeAmounts; // Amounts required for each staking type.
    mapping(uint256 => uint256) public reputationalStakingTypeAmounts; // Amounts of rALBT provided for each staking type.

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
}
