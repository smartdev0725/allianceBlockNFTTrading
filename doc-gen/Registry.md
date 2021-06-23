## `Registry`

Responsible for investment transactions.


Extends Initializable, Investment, OwnableUpgradeable


### `initialize(address escrowAddress, address governanceAddress_, address[] lendingTokens_, address fundingNFT_, uint256 baseAmountForEachPartition_)` (external)

Initialize


Constructor of the contract.


### `initializeInvestment(address reputationalAlbt, uint256 totalTicketsPerRun_, uint256 rAlbtPerLotteryNumber_, uint256 blocksLockedForReputation_, uint256 lotteryNumbersForImmediateTicket_)` (external)

Initialize Investment


This function is called by the owner to initialize the investment type.


### `setEscrowAddress(address escrowAddress_)` (external)

Update escrow address


This function is called by the owner to update the escrow address


### `addLendingToken(address lendingToken_)` (external)

Add lending token


This function is called by the owner to add another lending token.


### `decideForInvestment(uint256 investmentId, bool decision)` (external)

Decide For Investment


This function is called by governance to approve or reject a investment request.


### `startLotteryPhase(uint256 investmentId)` (external)

Start Lottery Phase


This function is called by governance to start the lottery phase for an investment.


### `_approveInvestment(uint256 investmentId_)` (internal)

Approve Investment




### `_rejectInvestment(uint256 investmentId_)` (internal)

Reject Investment




### `_startInvestment(uint256 investmentId_)` (internal)

Start Investment




### `getInvestmentMetadata(uint256 investmentId) → struct InvestmentLibrary.InvestmentDetails, enum InvestmentLibrary.InvestmentStatus, address` (public)

Get Investment Metadata


This helper function provides a single point for querying the Investment metadata
returns Investment Details, Investment Status, Investment Seeker Address and Repayment Batch Type

### `isValidReferralId(uint256 investmentId) → bool` (external)

IsValidReferralId


returns true if investment id exists (so also seeker exists), otherwise returns false


### `InvestmentStarted(uint256 investmentId)`





### `InvestmentApproved(uint256 investmentId)`





### `InvestmentRejected(uint256 investmentId)`





