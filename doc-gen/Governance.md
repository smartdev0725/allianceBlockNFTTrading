## `Governance`

Responsible for governing AllianceBlock's ecosystem

Extends Initializable, SuperGovernance



### `initialize(address superDelegator_, uint256 applicationsForInvestmentDuration_, uint256 lateApplicationsForInvestmentDuration_)` (external)

Initialize the contract.




### `updateSuperDelegator(address superDelegator_)` (external)

Update Superdelegator


This function is used to update the superDelegator address.


### `requestApproval(uint256 investmentId)` (external)

Request a investment or investment approval


Executes cronJob()


### `storeInvestmentTriggering(uint256 investmentId)` (external)

Stores Investment Duration


Adds cronJob



