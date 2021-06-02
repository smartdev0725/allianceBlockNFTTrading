## `SuperGovernance`

Responsible for govern AllianceBlock's ecosystem

Extends OwnableUpgradeable, DaoCronjob



### `setRegistryAndStaking(address registryAddress_, address stakingAddress_)` (external)

Sets Registry and Staking contracts


used to initialize SuperGovernance
requires not already initialized


### `superVoteForRequest(uint256 requestId, bool decision)` (external)

Votes for Request


Executes cronJob
requires msg.sender to be Super Delegator
requires current epoch to be 0 or 1


### `openDaoMembershipSubscriptions()` (external)

Opens DAO Membership Subscriptions


First step towards transitioning to second epoch

### `openDaoMembershipVoting()` (external)

Opens DAO Membership Voting


Second step towards transitioning to second epoch

### `openDaoDelegatingSubscriptions(uint256 amountOfDaoMembers_, uint256 daoClaimingDuration_, uint256 daoLateClaimingDuration_)` (external)

Opens DAO Delegator Subscriptions


Third step towards transitioning to second epoch


### `openDaoDelegatingVoting()` (external)

Opens DAO Delegator Voting


Fourth step towards transitioning to second epoch

### `openDaoDelegating(uint256 amountOfDaoDelegators_, uint256 daoMembershipVotingDuration_, uint256 daoDelegationVotingDuration_, uint256 daoDelegationApprovalDuration_, uint256 daoDelegationSubstituteClaimDuration_)` (external)

Opens DAO Delegator


Fifth (last) step towards transitioning to second epoch



