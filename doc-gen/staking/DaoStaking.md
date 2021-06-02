## `DaoStaking`



Extends StakingTypesAndStorage


### `provideStakingForDaoMembership(address staker)` (external)

Provide Staking for DAO Membership




### `provideStakingForDaoDelegator(address staker)` (external)

Provide Staking for DAO Delegators


requires staker to be a DAO Member Subscriber


### `unstakeDao(address staker, bool isDaoMember)` (external)

Unstake DAO




### `provideRewards(uint256 amountForDaoMembers, uint256 amountForDaoDelegators, uint256 epoch)` (external)

Provide Rewards




### `withdrawRewardsForDaoEpoch(uint256 epoch)` (external)

Withdraw Rewards for DAO Epoch


requires epoch to be valid
requires msg.sender to be a part of the DAO and not already withdrawn


### `_unstakeDaoDelegator(address staker_)` (internal)

Unstake DAO Delegator




### `_withdraw(address staker_, uint256 amount_)` (internal)

Withdraw




### `_stake(address staker_, uint256 amount_)` (internal)

Stake




### `getBalance(address staker_) → uint256` (external)

Get Balance


Retrieves the staked balance for a given user


### `getAmountsToStake() → uint256 stakerLvl1Amount, uint256 stakerLvl2Amount, uint256 stakerLvl3orDaoMemberAmount, uint256 daoDelegatorAmount` (external)

Get Amounts to Stake





