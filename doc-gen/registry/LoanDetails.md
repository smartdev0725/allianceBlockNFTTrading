## `LoanDetails`

Functionality for storing loan details and modifiers.


Extends Storage

### `onlyGovernance()`





### `onlySeeker(uint256 investmentId)`





### `onlyActivelyFundedLoan(uint256 investmentId)`





### `onlyActiveLoan(uint256 investmentId)`





### `onlyOnProjectRepayment(uint256 investmentId)`





### `onlySettledLoan(uint256 investmentId)`





### `onlyBetweenMilestoneTimeframe(uint256 investmentId)`





### `onlyBetweenBatchTimeframe(uint256 investmentId)`





### `onlyAfterDeadlineReached(uint256 investmentId)`





### `onlyPersonalLoan(uint256 investmentId)`





### `onlyProjectLoan(uint256 investmentId)`





### `onlyAcceptedNumberOfMilestones(uint256 totalMilestones)`





### `onlyWhenAwaitingMilestoneApproval(uint256 investmentId)`





### `onlyEnoughERC1155Balance(uint256 investmentId, uint256 amountOfTokens)`






### `_storeLoanDetails(enum LoanLibrary.LoanType loanType_, uint256 lendingAmountRequested_, address collateralToken_, uint256 collateralAmount_, uint256 interestPercentage_, string extraInfo_)` (internal)

Stores Loan Details


require a valid interest percentage



