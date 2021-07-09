## `ActionVerifier`

Handles user's Actions and Rewards within the protocol

Extends Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable


### `checkEpoch()`



Modifier that checks if time has come to change epoch.


### `initialize(uint256[4] rewardsPerActionProvisionPerLevel_, uint256[4] maxActionsPerDayPerLevel_, address escrow_, address stakerMedalNft_, uint256 chainId)` (external)



Initializer of the ActionVerifier contract.


### `hash(struct ActionVerifier.EIP712Domain eip712Domain) → bytes32` (internal)





### `updateVariables(uint256[4] rewardsPerActionProvisionPerLevel_, uint256[4] maxActionsPerDayPerLevel_)` (external)



This function is used by the owner to update variables.


### `importAction(string action, uint256[4] reputationalAlbtRewardsPerLevel, uint256[4] reputationalAlbtRewardsPerLevelAfterFirstTime, uint256 minimumLevelForProvision, address referralContract_)` (external)



This function is used by the owner to add more actions.


### `updateAction(string action, uint256[4] reputationalAlbtRewardsPerLevel, uint256[4] reputationalAlbtRewardsPerLevelAfterFirstTime, uint256 minimumLevelForProvision, address referralContract_)` (external)



This function is used by the owner to update already existing actions.


### `provideRewardsForActions(struct SignatureVerifier.Action[] actions, bytes[] signatures)` (external)



This function is used by users to provide rewards to all users for their actions.


### `checkAction(string action, uint256 stakingLevel) → bool exist` (public)

Check Action


checks if given action has a reward for specific level


### `_checkValidActionProvision(struct SignatureVerifier.Action action, bytes signature, uint256 stakingLevelOfProvider) → bool, uint256` (internal)



Checks if an action provision is valid
returns true if action is ok and also the reward for the account done the action.

### `_storeAction(string action, uint256[4] reputationalAlbtRewardsPerLevel, uint256[4] reputationalAlbtRewardsPerLevelAfterFirstTime, uint256 minimumLevelForProvision, address referralContract_)` (internal)

Store action


This function is storing all specs for an action.


### `EpochChanged(uint256 epochId, uint256 endingTimestamp)`





### `ActionImported(string actionName)`





### `ActionUpdated(string actionName)`





### `ActionsProvided(struct SignatureVerifier.Action[] actions, bytes[] signatures, address provider)`





