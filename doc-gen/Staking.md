## `Staking`

Responsible for ALBT Staking


Extends  Initializable, StakingDetails, OwnableUpgradeable


### `initialize(address albt_, address escrow_, address stakerMedalNFT_, uint256[] stakingTypeAmounts_, uint256[] reputationalStakingTypeAmounts_)` (external)

Initialize


Initialize of the contract.


### `stake(enum StakingTypesAndStorage.StakingType stakingType)` (external)

Stake


requires not Delegator and cannot repeat staking type

### `unstake(enum StakingTypesAndStorage.StakingType stakingType)` (external)

Unstake


msg.sender withdraws till reaching stakingType

### `exit()` (external)

Exit


msg.sender withdraws and exits

### `_getStakingType(address account) → uint256` (internal)

Get Staking Type




### `_applyReputation(address account, uint256 previousLevelIndex, uint256 newLevelIndex)` (internal)

Apply Reputation




### `_applyMedal(address account, uint256 previousLevelIndex, uint256 newLevelIndex)` (internal)

Apply Medal




### `_findAmount(uint256 bigIndex, uint256 smallIndex) → uint256 amount` (internal)

Find Amount





