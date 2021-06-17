## `Governance`

Responsible for governing AllianceBlock's ecosystem

Extends Initializable, DaoSubscriptions



### `initialize(address superDelegator_, uint256 loanApprovalRequestDuration_, uint256 milestoneApprovalRequestDuration_, uint256 daoUpdateRequestDuration_, uint256 approvalsNeededForRegistryRequest_, uint256 approvalsNeededForGovernanceRequest_, uint256 applicationsForInvestmentDuration_, uint256 lateApplicationsForInvestmentDuration_)` (public)

Initialize the contract.




### `requestApproval(uint256 investmentId, bool isMilestone, uint256 milestoneNumber)` (external)

Request a loan or investment approval


Executes cronJob()


### `voteForRequest(uint256 requestId, bool decision)` (external)

Used for voting on a Request


Executes cronjob()


### `storeInvestmentTriggering(uint256 investmentId)` (external)

Stores Investment Duration


Adds cronJob


### `getDaoData() → uint256, uint256, uint256, uint256, uint256` (public)

Helper function for querying Governance variables


returns internal Governance uint variables


