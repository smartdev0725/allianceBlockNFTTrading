## `Staking`

Responsible for ALBT Staking


Extends  Initializable, DaoStaking, OwnableUpgradeable

### `updateReward(address account)`






### `initialize(contract IERC20 albt_, address governance_, address escrow_, uint256[] stakingTypeAmounts_, uint256[] reputationalStakingTypeAmounts_)` (public)

Initialize


Initialize of the contract.


### `setRewardDistribution(address _rewardDistribution)` (external)

Set Reward Distribution




### `lastTimeRewardApplicable() → uint256` (public)

Last Time Reward Applicable


checks if the staking period is positive

### `rewardPerToken() → uint256` (public)

Calculate Rewards per Token


returns the calculated reward

### `earned(address account) → uint256` (public)

Earned




### `stake(enum StakingTypesAndStorage.StakingType stakingType)` (public)

Stake


requires not Delegator and cannot repeat staking type

### `exit()` (external)

Exit


msg.sender withdraws and exits
requires msg.sender not subscribed

### `getReward()` (public)

Get Rewards


accrues rewards to msg.sender

### `notifyRewardAmount(uint256 reward)` (external)

Notify Reward Amount




### `_getStakingType(address account) → uint256` (internal)

Get Staking Type




### `_applyReputation(address account, uint256 previousLevelIndex, uint256 newLevelIndex)` (internal)

Apply Reputation




### `findAmount(uint256 bigIndex, uint256 smallIndex) → uint256 amount` (internal)

Find Amount





