## `DaoCronjob`

Responsible for governing AllianceBlock's ecosystem

Extends GovernanceTypesAndStorage


### `checkCronjob()`






### `checkCronjobs() → bool` (public)

Checks if needs to execute a DAO cronJob


Calls executeCronjob() at the most 1 cronJob per tx

### `executeCronjob(uint256 cronjobId, uint256 timestamp)` (internal)

Executes the next DAO cronJob




### `addCronjob(enum GovernanceTypesAndStorage.CronjobType cronjobType, uint256 timestamp, uint256 externalId)` (internal)

Adds a cronJob to the queue


Adds a node to the cronjobList (ValuedDoubleLinkedList)


### `removeCronjob(uint256 cronjobId)` (internal)

Removes a cronJob from the queue


Removes a node from the cronjobList (ValuedDoubleLinkedList)


### `updateInvestment(uint256 investmentId, uint256 timestamp)` (internal)

Updates an investment


checks if lottery should start or adds cronJob for late application


### `updateDaoMembershipVotingState(uint256 timestamp)` (internal)

Updates Dao Membership Voting


run by the cronJob update


### `updateDaoDelegationVotingState(uint256 timestamp)` (internal)

Updates Dao Delegator Voting


run by the cronJob update


### `changeEpoch(uint256 timestamp) → uint256` (internal)

Updates current protocol epoch


run by the cronJob update


### `executeDaoApproval(uint256 requestId)` (internal)

Executes DAO Approval


run by the cronJob update


### `checkTimestampOfLastRequestForCurrentEpoch(uint256 requestsRemaining) → uint256` (internal)

Checks timestamp for latest request for current epoch


run by the cronJob update


### `penaltizeDelegatorsForNonVoting(uint256 amountOfPenaltizedDelegators, uint256 epochOfRequest, uint256 requestId)` (internal)

Penalizes Active Delegators for not voting


run by the cronJob update


### `removePenaltizedDelegatorFromActiveRequests(uint256 delegatorId, uint256 epoch)` (internal)

Remove penalized Delegators from Active duty


run by the cronJob update


### `addSubstituteToAllActiveRequests(uint256 delegatorId, uint256 epoch)` (internal)

Adds substitutes to all Active Requests


run by the cronJob update


### `updateSubstitutes()` (internal)

Updates Delegator substitutes


run by the cronJob update

### `requestSubstitutes(uint256 amountOfSubstitutes)` (internal)

Requests substitutes for DAO Delegator


run by the cronJob update



