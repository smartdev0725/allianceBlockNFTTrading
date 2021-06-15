## `ProjectLoan`

Functionality for Project Loan.


Extends LoanDetails


### `requestProjectLoan(uint256[] amountRequestedPerMilestone, address collateralToken, uint256 collateralAmount, uint256 projectTokenPrice, uint256 interestPercentage, uint256 discountPerMillion, uint256 totalMilestones, uint256[] milestoneDurations, uint256 paymentTimeInterval, string extraInfo)` (external)

Request Project Loan


This function is used for potential borrowing project to request a loan.
requires Total milestones should coincide with requested amounts and durations


### `applyMilestone(uint256 investmentId)` (external)

Apply Milestone


This function is used by the project to apply a milestone for a specific loan.


### `decideForMilestone(uint256 investmentId, bool decision)` (external)

Decide For Loan


This function is called by governance to approve or reject an applied milestone's request.


### `_approveMilestone(uint256 loanId_)` (internal)

Approve Milestone




### `_rejectMilestone(uint256 loanId_)` (internal)

Reject Milestone




### `_storeProjectLoanPayments(uint256 discountPerMillion_, uint256 projectTokenPrice_, uint256 totalMilestones_, uint256 paymentTimeInterval_)` (internal)

Store Project Loan Payments




### `_storeMilestoneDetailsAndGetTotalAmount(uint256[] amountRequestedPerMilestone, uint256[] milestoneDurations, uint256 totalMilestones) → uint256 totalAmountRequested` (internal)

Store Project Loan Payments




### `_startProjectLoan(uint256 loanId_)` (internal)

Starts a Project Loan




### `_getMockedPriceForMilestone(uint256 milestone) → uint256 price` (internal)

Generates a mocked price for a milestone




### `_challengeProjectLoan(uint256 loanId_)` (internal)

Challenges a Project Loan




### `_transferFundingNFTToProjectFunder(uint256 loanId_, uint256 partitionsFunded_, address funder_)` (internal)

Transfers FundingNFT to Project Funder




### `_executeProjectLoanPayment(uint256 loanId_)` (internal)

Executes Project Loan Payment




### `_receiveProjectLoanPayment(uint256 loanId_, uint256 generation_, uint256 amountOfTokens_, bool onProjectTokens_)` (internal)

Receives a Project Loan Payment




### `_receiveLendingTokenPayment(uint256 loanId_, uint256 generation_, uint256 amountOfTokens_)` (internal)

Receive a Lending Token Payment


requires available Loan NFT balance


### `_receiveProjectTokenPayment(uint256 loanId_, uint256 amountFundingNFT_)` (internal)

Receive a Project Token Payment


requires available Funding NFT


### `_burnFundingNFTAmountOverGenerations(uint256 loanId_, uint256 amountFundingNFT_)` (internal)

Burns Funding NFT amount over Generations




### `getMilestonesInfo(uint256 loanId_, uint256 milestone_) → uint256 amount, uint256 timestamp` (public)

Retrieve Milestone info




### `getAmountToBeRepaid(uint256 investmentId) → uint256 amount` (public)

Retrieves the amount to be repaid to fulfill a loan


getAmountToBeRepaid is a function to obtain the amount that should be paid to settle the loan
taking into account the amount paid back with project tokens and the interest percentage.


### `getTotalInterest(uint256 investmentId) → uint256 totalInterest` (public)

Retrieves the total interest


getTotalInterest is a function to obtain the total amount of interest to pay back
taking into account the interest free amount paid back with project tokens and the interest percentage set for the loan.


### `balanceOfAllFundingNFTGenerations(uint256 investmentId, address funder) → uint256 balance` (public)

Balance of all Funding NFT over Generations




### `balanceOfFundingNFTGeneration(uint256 investmentId, uint256 generation, address funder) → uint256 balance` (public)

Balance of all Funding NFT per Generation




### `getProjectTokenPrice(uint256 investmentId) → uint256 price` (public)

Retrieves the Project Token Price




### `getDiscountedProjectTokenPrice(uint256 investmentId) → uint256 price` (public)

Calculates the Discounted Project Token price




### `getAvailableFundingNFTForConversion(uint256 investmentId, address funder) → uint256 balance` (public)

Calculates the available Funding NFT for conversion




### `getAmountOfProjectTokensToReceive(uint256 investmentId, uint256 amountFundingNFT) → uint256 amount` (public)

Calculates the amount of Project Tokens to receive





### `ProjectLoanRequested(uint256 investmentId, address user, uint256 amount)`





### `ProjectLoanMilestoneApprovalRequested(uint256 investmentId, uint256 milestoneNumber)`





### `ProjectLoanMilestoneDecided(uint256 investmentId, bool decision)`





### `ProjectTokenPaymentReceived(uint256 investmentId, address user, uint256 amountOfProjectTokens, uint256 discountedPrice)`





