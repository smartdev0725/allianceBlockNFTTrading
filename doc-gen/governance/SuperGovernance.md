## `SuperGovernance`

Responsible for govern AllianceBlock's ecosystem

Extends OwnableUpgradeable, DaoCronjob



### `__SuperGovernance_init()` (public)





### `setRegistry(address registryAddress_)` (external)

Sets Registry contract



used to initialize SuperGovernance
requires not already initialized


### `superVoteForRequest(uint256 requestId, bool decision)` (external)

Votes for Request


Executes cronJob
requires msg.sender to be Super Delegator
requires current epoch to be 0 or 1



