pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./staking/DaoStaking.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "hardhat/console.sol";

contract Staking is Initializable, DaoStaking, OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
 * @dev Initialize of the contract.
 */
    function initialize(IERC20 albt_, address governance_, uint256[] memory stakingTypeAmounts_) public initializer {
        __Ownable_init();
        albt = albt_;
        governance = IGovernanceStaking(governance_);

        // Initialize some constants
        STAKING_DURATION = 7 days;
        periodFinish = 0;
        rewardRate = 0;

        for(uint256 i = 0; i < stakingTypeAmounts_.length; i++) {
            stakingTypeAmounts[i] = stakingTypeAmounts_[i];
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

    function setRewardDistribution(address _rewardDistribution)
        external
        onlyOwner
    {
        rewardDistribution = _rewardDistribution;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

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

    function earned(address account) public view returns (uint256) {
        return
            balance[account]
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    function stake() public updateReward(msg.sender) {
        require(balance[msg.sender] == 0, "Cannot stake again");
        uint256 amount = stakingTypeAmounts[uint256(StakingType.STAKER)];

        _stake(msg.sender, amount);
        emit Staked(msg.sender, amount);
    }

    function exit() external {
        require(!freezed[msg.sender], "Unsubscribe to exit");
        _withdraw(msg.sender, balance[msg.sender]);
        getReward();
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            albt.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

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
}
