## `Registry`

Responsible for loan transactions.


Extends Initializable, PersonalLoan, ProjectLoan, OwnableUpgradeable


### `initialize(address escrowAddress, address governanceAddress_, address lendingToken_, address mainNFT_, address fundingNFT_, uint256 baseAmountForEachPartition_, uint256 minimumInterestPercentage_, uint256 maxMilestones_, uint256 milestoneExtensionInterval_, uint256 vestingBatches_, uint256 vestingTimeInterval_, uint256 fundingTimeInterval_)` (public)

Initialize


Constructor of the contract.


### `initializeInvestment(address reputationalAlbt, uint256 totalTicketsPerRun_, uint256 rAlbtPerLotteryNumber_, uint256 blocksLockedForReputation_, uint256 lotteryNumbersForImmediateTicket_)` (external)

Initialize Investment


This function is called by the owner to initialize the investment type.


### `decideForLoan(uint256 investmentId, bool decision)` (external)

Decide For Loan


This function is called by governance to approve or reject a loan request.


### `fundLoan(uint256 investmentId, uint256 partitionsToPurchase)` (external)

Fund Loan


This function is called by the lenders to fund a loan.
requires enough purchasable partitions


### `executePayment(uint256 investmentId)` (external)

Execute Payment


This function is called by the seeker to return part of or whole owed amount for a loan (depending on agreement).


### `receivePayment(uint256 tokenId, uint256 amountOfTokens, bool onProjectTokens)` (external)

Receive Payment


This function is called by ERC1155 holders to receive a payment (after seeker has repaid part of loan).


### `startLotteryPhase(uint256 investmentId)` (external)

Start Lottery Phase


This function is called by governance to start the lottery phase for an investment.


### `challengeLoan(uint256 investmentId)` (external)

Challenge Loan


Through this function any address can challenge a loan in case of rules breaking by the borrower.
            If challenging succeeds it can end up to either small penalty or whole collateral loss.


### `_approveLoan(uint256 loanId_)` (internal)

Approve Loan




### `_rejectLoan(uint256 loanId_)` (internal)

Reject Loan




### `_startLoan(uint256 loanId_)` (internal)

Start Loan




### `getLoanMetadata(uint256 investmentId) → struct LoanLibrary.LoanDetails, enum LoanLibrary.InvestmentStatus, address, enum LoanLibrary.RepaymentBatchType` (public)

Get Loan Metadata


This helper function provides a single point for querying the Loan metadata
returns Loan Details, Loan Status, Loan Seeker Address and Repayment Batch Type


### `LoanPartitionsPurchased(uint256 investmentId, uint256 partitionsToPurchase, address lender)`





### `LoanStarted(uint256 investmentId, enum LoanLibrary.LoanType loanType)`





### `LoanApproved(uint256 investmentId, enum LoanLibrary.LoanType loanType)`





### `LoanRejected(uint256 investmentId, enum LoanLibrary.LoanType loanType)`





### `LoanChallenged(uint256 investmentId, enum LoanLibrary.LoanType loanType, address user)`





### `PaymentReceived(uint256 investmentId, uint256 amountOfTokens, uint256 generation, bool onProjectTokens, address user)`





### `PaymentExecuted(uint256 investmentId, enum LoanLibrary.LoanType loanType, address seeker)`





