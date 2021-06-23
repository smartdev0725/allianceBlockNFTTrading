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


### `updateInvestment(uint256 investmentId, uint256 timestamp)` (internal)

Updates an investment


checks if lottery should start or adds cronJob for late application



