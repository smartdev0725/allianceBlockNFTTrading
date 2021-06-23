## `Investment`

Functionality for Investment.


Extends InvestmentDetails.


### `__Investment_init()` (public)





### `requestInvestment(address investmentToken, uint256 amountOfInvestmentTokens, address lendingToken, uint256 totalAmountRequested_, string extraInfo)` (external)

Requests investment


This function is used for seekers to request investment in exchange for investment tokens.
require valid amount


### `showInterestForInvestment(uint256 investmentId, uint256 amountOfPartitions)` (external)

user show interest for investment


This function is called by the investors who are interested to invest in a specific investment token.
require Approval state and valid partition


### `_applyImmediateTicketsAndProvideLuckyNumbers(uint256 investmentId_, uint256 amountOfPartitions_)` (internal)





### `executeLotteryRun(uint256 investmentId)` (external)

Executes lottery run


This function is called by any investor interested in an Investment Token to run part of the lottery.
requires Started state and available tickets


### `withdrawInvestmentTickets(uint256 investmentId, uint256 ticketsToLock, uint256 ticketsToWithdraw)` (external)

Withdraw Investment Tickets


This function is called by an investor to withdraw his tickets.
require Settled state and enough tickets won


### `withdrawAmountProvidedForNonWonTickets(uint256 investmentId)` (external)



This function is called by an investor to withdraw lending tokens provided for non-won tickets.


### `withdrawLockedInvestmentTickets(uint256 investmentId, uint256 ticketsToWithdraw)` (external)

Withdraw locked investment ticket.


This function is called by an investor to withdraw his locked tickets.
requires Settled state and available tickets.


### `getRequestingInterestStatus(uint256 investmentId) → bool` (external)

Gets Requesting status


Returns true if investors have shown interest for equal or more than the total tickets.


### `_getRandomNumber(uint256 maxNumber) → uint256 randomNumber` (internal)

Generates Random Number


This function generates a random number


### `_updateReputationalBalanceForPreviouslyLockedTokens() → uint256` (internal)

Updates reputation balance


updates balance of reputation for locked tokens


### `_withdrawAmountProvidedForNonWonTickets(uint256 investmentId_)` (internal)





### `convertNFTToInvestmentTokens(uint256 investmentId, uint256 amountOfNFTToConvert)` (external)

Convert NFT to investment tokens





### `InvestmentRequested(uint256 investmentId, address user, uint256 amount)`





### `InvestmentInterest(uint256 investmentId, uint256 amount)`





### `LotteryExecuted(uint256 investmentId)`





### `WithdrawInvestment(uint256 investmentId, uint256 ticketsToLock, uint256 ticketsToWithdraw)`





### `WithdrawAmountForNonTickets(uint256 indexedinvestmentId, uint256 amountToReturnForNonWonTickets)`





### `WithdrawLockedInvestmentTickets(uint256 indexedinvestmentId, uint256 ticketsToWithdraw)`





### `ConvertNFTToInvestmentTokens(uint256 indexedinvestmentId, uint256 amountOfNFTToConvert, uint256 amountOfInvestmentTokenToTransfer)`





