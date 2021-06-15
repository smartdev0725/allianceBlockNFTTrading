## `PersonalLoan`

Functionality for Personal Loan.


Extends LoanDetails


### `requestPersonalLoan(uint256 amountRequested, address collateralToken, uint256 collateralAmount, uint256 totalAmountOfBatches, uint256 interestPercentage, uint256 batchTimeInterval, string extraInfo, enum LoanLibrary.RepaymentBatchType repaymentBatchType)` (external)

Request Personal Loan


This function is used for potential seekers to request a personal loan.
require amount to be a multiplier of the base amount


### `_storePersonalLoanPayments(uint256 totalAmountOfBatches_, uint256 batchTimeInterval_, enum LoanLibrary.RepaymentBatchType repaymentBatchType_)` (internal)

Store Personal Loan Payments




### `_startPersonalLoan(uint256 loanId_)` (internal)

Starts a Personal Loan




### `_challengePersonalLoan(uint256 loanId_)` (internal)

Challenge a Personal Loan




### `_executePersonalLoanPayment(uint256 loanId_)` (internal)

Execute a Personal Loan Payment




### `_executePersonalLoanInterestOnlyPayment(uint256 loanId_)` (internal)

Execute a Personal Loan Interest Payment




### `_transferPersonalLoanPayment(uint256 loanId_, uint256 amount)` (internal)

Transfer a Personal Loan Payment




### `_receivePersonalLoanPayment(uint256 loanId_, uint256 generation_, uint256 amountOfTokens_)` (internal)

Receive a Personal Loan Payment


requires elligibility



### `PersonalLoanRequested(uint256 investmentId, address user, uint256 amount)`





