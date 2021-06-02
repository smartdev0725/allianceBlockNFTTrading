## `LoanDetails`

Functionality for storing loan details and modifiers.


Extends Storage

### `onlyGovernance()`





### `onlySeeker(uint256 loanId)`





### `onlyActivelyFundedLoan(uint256 loanId)`





### `onlyActiveLoan(uint256 loanId)`





### `onlyOnProjectRepayment(uint256 loanId)`





### `onlySettledLoan(uint256 loanId)`





### `onlyBetweenMilestoneTimeframe(uint256 loanId)`





### `onlyBetweenBatchTimeframe(uint256 loanId)`





### `onlyAfterDeadlineReached(uint256 loanId)`





### `onlyPersonalLoan(uint256 loanId)`





### `onlyProjectLoan(uint256 loanId)`





### `onlyAcceptedNumberOfMilestones(uint256 totalMilestones)`





### `onlyWhenAwaitingMilestoneApproval(uint256 loanId)`





### `onlyEnoughERC1155Balance(uint256 loanId, uint256 amountOfTokens)`






### `_storeLoanDetails(enum LoanLibrary.LoanType loanType_, uint256 lendingAmountRequested_, address collateralToken_, uint256 collateralAmount_, uint256 interestPercentage_, string extraInfo_)` (internal)

Stores Loan Details


require a valid interest percentage



