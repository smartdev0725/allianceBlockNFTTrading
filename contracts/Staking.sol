pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./staking/DaoStaking.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "hardhat/console.sol";

/**
 * @title AllianceBlock Staking contract
 * @notice Responsible for ALBT Staking
 * @dev Extends  Initializable, DaoStaking, OwnableUpgradeable
 */
 contract Staking is Initializable, DaoStaking, OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Initialize
     * @dev Initialize of the contract.
     * @param albt_ the albt IERC20 token
     * @param governance_ the DAO address
     * @param escrow_ the escrow address
     * @param stakingTypeAmounts_ the array of Staking Type Amounts
     * @param reputationalStakingTypeAmounts_ the array of Reputation Staking Type Amounts
    */
    function initialize(
        IERC20 albt_,
        address governance_,
        address escrow_,
        uint256[] memory stakingTypeAmounts_,
        uint256[] memory reputationalStakingTypeAmounts_
    ) public initializer {
        __Ownable_init();
        albt = albt_;
        governance = IGovernanceStaking(governance_);
        escrow = IEscrow(escrow_);

        // Initialize some constants
        STAKING_DURATION = 7 days;
        periodFinish = 0;
        rewardRate = 0;

        for(uint256 i = 0; i < stakingTypeAmounts_.length; i++) {
            stakingTypeAmounts[i] = stakingTypeAmounts_[i];
            reputationalStakingTypeAmounts[i] = reputationalStakingTypeAmounts_[i];
        }
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /**
     * @notice Set Reward Distribution
     * @param _rewardDistribution the address for distribute the rewards to
    */
    function setRewardDistribution(address _rewardDistribution)
        external
        onlyOwner
    {
        rewardDistribution = _rewardDistribution;
    }

    /**
     * @notice Last Time Reward Applicable
     * @dev checks if the staking period is positive
    */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    /**
     * @notice Calculate Rewards per Token
     * @dev returns the calculated reward
    */
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable()
                    .sub(lastUpdateTime)
                    .mul(rewardRate)
                    .mul(1e18)
                    .div(totalSupply)
            );
    }

    /**
     * @notice Earned
     * @param account the address
     * @return the staked earnings for the account
    */
    function earned(address account) public view returns (uint256) {
        return
            balance[account]
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    /**
     * @notice Stake
     * @param stakingType The staking type
     * @dev requires not Delegator and cannot repeat staking type
    */
    function stake(StakingType stakingType) public updateReward(msg.sender) {
        require(uint256(stakingType) < 3, "Delegator type stake only via Governance");
        require(balance[msg.sender] < stakingTypeAmounts[uint256(stakingType)], "Cannot stake for same type again");
        uint256 amount = stakingTypeAmounts[uint256(stakingType)];

        uint256 stakingTypeIndex = _getStakingType(msg.sender);

        _applyReputation(msg.sender, stakingTypeIndex, uint256(stakingType).add(1));

        _stake(msg.sender, amount.sub(balance[msg.sender]));
        emit Staked(msg.sender, amount.sub(balance[msg.sender]));
    }

    // TODO - Add way to unstake only partially (drop levels)


    /**
     * @notice Exit
     * @dev msg.sender withdraws and exits
     * @dev requires msg.sender not subscribed
    */
    function exit() external {
        require(!freezed[msg.sender], "Unsubscribe to exit");

        uint256 stakingTypeIndex = _getStakingType(msg.sender);

        _applyReputation(msg.sender, stakingTypeIndex, 0);

        _withdraw(msg.sender, balance[msg.sender]);
        getReward();
    }

    /**
     * @notice Get Rewards
     * @dev accrues rewards to msg.sender
    */
    function getReward() public updateReward(msg.sender) {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            albt.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @notice Notify Reward Amount
     * @param reward the reward amount
    */
    function notifyRewardAmount(uint256 reward)
        external
        onlyRewardDistribution
        updateReward(address(0))
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(STAKING_DURATION);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(STAKING_DURATION);
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(STAKING_DURATION);
        emit RewardAdded(reward);
    }

    /**
     * @notice Get Staking Type
     * @param account the address
     * @return the staking type
    */
    function _getStakingType(address account) internal view returns (uint256) {
        for (uint256 i = 0; i < 4; i++) {
            if (balance[account] == stakingTypeAmounts[i]) {
                return i.add(1);
            }
        }

        return 0;
    }

    /**
     * @notice Apply Reputation
     * @param account the address
     * @param previousLevelIndex The index of the previous level
     * @param newLevelIndex the index for the new level
    */
    function _applyReputation(
        address account,
        uint256 previousLevelIndex,
        uint256 newLevelIndex
    )
        internal
    {
        if (previousLevelIndex < newLevelIndex) {
            uint256 amountToMint = findAmount(newLevelIndex, previousLevelIndex);

            escrow.mintReputationalToken(account, amountToMint);
        }
        else {
            uint256 amountToBurn = findAmount(previousLevelIndex, newLevelIndex);

            escrow.burnReputationalToken(account, amountToBurn);
        }
    }

    /**
     * @notice Find Amount
     * @param bigIndex ???
     * @param smallIndex ???
     * @return amount of reputation
    */
    function findAmount(uint256 bigIndex, uint256 smallIndex) internal view returns (uint256 amount) {
        if (bigIndex > 3) bigIndex = 3;
        if (smallIndex == 0) {
            amount = reputationalStakingTypeAmounts[bigIndex.sub(1)];
        }
        else {
            amount = reputationalStakingTypeAmounts[bigIndex.sub(1)].sub(
                reputationalStakingTypeAmounts[smallIndex.sub(1)]);
        }
    }
}
