// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "../interfaces/IGovernanceStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AllianceBlock StakingStorage contract
 * @notice Responsible for staking storage
 */
contract StakingTypesAndStorage {
    enum StakingType {
        STAKER,
        DAO_MEMBER,
        DAO_DELEGATOR
    }

    uint256 public STAKING_DURATION = 7 days;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    mapping(uint256 => uint256) public rewardsPerEpochForDaoMembers;
    mapping(uint256 => uint256) public rewardsPerEpochForDaoDelegators;
    mapping(address => bool) public hasWithdrawn;

    // ALBT token
    IERC20 public albt;

    IGovernanceStaking public governance;
    address public rewardDistribution;

    uint256 public totalSupply;
    uint256 public currentEpoch;
    mapping(address => uint256) public balance;
    mapping(address => bool) public freezed;
    mapping(uint256 => uint256) public stakingTypeAmounts; // Amounts required for each staking type.

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    modifier onlyRewardDistribution() {
        require(msg.sender == rewardDistribution, "Caller is not reward distribution");
        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == address(governance));
        _;
    }
}
