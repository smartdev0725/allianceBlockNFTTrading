## `GovernanceTypesAndStorage`

Responsible for governance storage



### `onlyRegistry()`





### `onlyDaoDelegatorNotVoted(uint256 requestId, uint256 epochSubmitted)`





### `onlyBeforeDeadline(uint256 requestId)`





### `onlyAfterDeadlineAndNotApproved(uint256 requestId)`







### `VotedForRequest(uint256 loanId, uint256 requestId, bool decision, address user)`





### `ApprovalRequested(uint256 loanId, bool isMilestone, uint256 milestoneNumber, address user)`





### `InitGovernance(address registryAddress_, address stakingAddress_, address user)`





