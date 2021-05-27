## `ActionVerifier`

Handles user's Actions and Rewards within the protocol

Extends Initializable, OwnableUpgradeable



### `initialize(uint256 rewardPerActionProvision_, uint256 maxActionsPerProvision_, address escrow_)` (public)



Constructor of the ActionVerifier contract.


### `importAction(string action, uint256 reputationalAlbtReward)` (external)



This function is used by the owner to add more actions.


### `provideRewardsForActions(struct SignatureVerifier.Action[] actions, bytes[] signatures)` (external)



This function is used by users to provide rewards to all users for their actions.



