## `Investment`

Functionality for Investment.


Extends LoanDetails


### `requestInvestment(address investmentToken, uint256 amountOfInvestmentTokens, uint256 totalAmountRequested_, string extraInfo)` (external)

Requests investment


This function is used for projects to request investment in exchange for project tokens.
require valid amount


### `showInterestForInvestment(uint256 investmentId, uint256 amountOfPartitions)` (external)

user show interest for investment


This function is called by the investors who are interested to invest in a specific project.
require Approval state and valid partition


### `executeLotteryRun(uint256 investmentId)` (external)

Executes lottery run


This function is called by any investor interested in a project to run part of the lottery.
requires Started state and available tickets


### `withdrawInvestmentTickets(uint256 investmentId, uint256 ticketsToLock, uint256 ticketsToWithdraw)` (external)

Withdraw Investment Tickets


This function is called by an investor to withdraw his tickets.
require Settled state and enough tickets won


### `withdrawLockedInvestmentTickets(uint256 investmentId, uint256 ticketsToWithdraw)` (external)

Withdraw locked investment ticket


This function is called by an investor to withdraw his locked tickets.
requires Settled state and available tickets


### `getRequestingInterestStatus(uint256 investmentId) → bool` (external)

Gets Requesting status


Returns true if investors have shown interest for equal or more than the total tickets.


### `getRandomNumber(uint256 maxNumber) → uint256 randomNumber` (internal)

Generates Random Number


This function generates a random number


### `_updateReputationalBalanceForPreviouslyLockedTokens() → uint256` (internal)

Updates reputation balance


updates balance of reputation for locked tokens



