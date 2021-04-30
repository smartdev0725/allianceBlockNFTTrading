# Transaction flows
## Personal loan
1. Registry:requestPersonalLoan
uint256 amountRequested: The lending amount the borrower is looking to get.
address collateralToken: The token that will be used by the borrower as collateral.
uint256 collateralAmount: The amount of tokens that will be used by the borrower as collateral.
uint256 totalAmountOfBatches: The amount of batches in which loan will be repaid. 
uint256 interestPercentage: The interest percentage that will be obtained after whole repayment.
uint256 batchTimeInterval: The time interval between repayment batches.
string memory extraInfo: The ipfs hash where more specific details for loan request are stored.
LoanLibrary.RepaymentBatchType repaymentBatchType: The way the repayment in each batch will happen, ONLY_INTEREST or INTEREST_PLUS_NOMINAL. ONLY_INTEREST means that in every batch part of the interest will be repaid and whole nominal in the last batch. INTEREST_PLUS_NOMINAL means that in every batch part of the interest and nominal will be repaid.

### A borrower requests a personal loan by sending a requestPersonalLoan transaction of the Registry contract. When all input parameters are valid, this transaction will:
* Transfer the collateral tokens from the borrower into the escrow
* Store the details of the loan
* Change the state of the loan to REQUESTED
* Mint loan NFT tokens for the total number of partitions to the escrow
* Pause the loan NFT token transfer
* Request approval for the loan to the Governance

1. Governance:voteForRequest
uint256 requestId: The id of the request to vote for.
bool decision: True to approve the request.

Delegators can now vote to approve the loan request. When enough unique delegators have given their approval before the approval duration is expired, the status of the loan will be changed to APPROVED and the loan NFT token transfers will be unpaused so they can be transferred to lenders during the loan funding.



Governance:challengeRequest
uint256 requestId: The id of the request to vote for.

When a loan request is not approved in a specified time, it can be rejected with this transaction. The loan will be set to the status REJECTED and the collateral token will be transferred from the escrow back to the borrower that requested the loan.

Registry:fundLoan
uint256 loanId: The id of the loan to fund.
uint256 partitionsToPurchase: The number of partitions of the loan to purchase.

When a loan is approved and as long as there are partitions available to purchase it can be funded by lenders. The loan will go to the status FUNDING from the first successful fundLoan transaction that is made. In this transaction lending tokens will be sent from the lender to the escrow and in exchange the lender will get as much loan NFT’s as the partitions he purchased. If the last partition is purchased, the loan will automatically go to status STARTED, the first repayment period will be set and the lending tokens are transferred to the borrower.



Registry:executePayment
uint256 loanId: The id of the loan to repay.

A borrower should repay the loan back in batches in specified time intervals. He can do so by sending this transaction. The amount of lending token that should be paid back in the current batch will be sent from the borrower into the escrow.
If all batches are paid, the loan will be SETTLED.




Registry:receivePayment
 uint256 tokenId: The token id of the ERC1155 tokens eligible for payment.
uint256 amountOfTokens: The amount of tokens to receive payment for.
bool onProjectTokens: Only used in projectLoans.

The lenders holding loan NFT’s can claim their part of the repayments made by the borrower. By validating the generation of the loan NFT’s, the contract checks that the lender didn't receive its payment for this batch yet. If that is checked, the specified loan NFT’s will be burned and the same amount of new tokens of a next generation will be minted, which makes the holder eligible again to receive part of the next payment. The payment itself is received by the lender from the escrow in lending tokens with the amount depending on the number of loan NFT’s the lender used.


Registry:challengeLoan
uint256 loanId: The id of the loan to challenge.

After the deadline of a repayment is reached, anyone could challenge the loan. If it is the first time a deadline has passed, the time is extended. If the extended time is passed again without repayment, the loan can be challenged again resulting in the loan going to the DEFAULT state.


## Project loan
Registry:requestProjectLoan
 int256[] amountRequestedPerMilestone: The lending amounts project is looking to get for each milestone.
 address collateralToken: The token that will be used by the project as collateral.
 uint256 collateralAmount: The amount of tokens that will be used by the project as collateral.
 uint256 interestPercentage: The interest percentage that will be obtained after whole repayment.
 uint256 totalMilestones: The total amount of Milestones project is requesting funds for.
 uint256[] milestoneDurations: The duration of each milestone.
 uint256 timeDiffBetweenDeliveryAndRepayment: The time interval between the last milestone delivery and the repayment of the loan.
 string extraInfo: The ipfs hash where more specific details for the loan request are stored.

### A borrower requests a project loan by sending a requestProjectLoan transaction of the Registry contract. When all input parameters are valid, this transaction will:
* Transfer the collateral tokens from the borrower into the escrow
* Store the details of the loan
* Change the state of the loan to REQUESTED
* Mint loan NFT tokens for the total number of partitions to the escrow
* Pause the loan NFT token transfer
* Request approval for the loan to the Governance

Governance:voteForRequest
uint256 requestId: The id of the request to vote for.
bool decision: True to approve the request.

Delegators can now vote to approve the loan request. When enough unique delegators have given their approval before the approval duration is expired, the status of the loan will be changed to APPROVED and the loan NFT token transfers will be unpaused so they can be transferred to lenders during the loan funding.


Governance:challengeRequest
uint256 requestId: The id of the request to challenge.

When a loan request is not approved in a specified time, it can be rejected with this transaction. The loan will be set to the status REJECTED and the collateral token will be transferred from the escrow back to the borrower that requested the loan.

Registry:fundLoan
uint256 loanId: The id of the loan.
uint256 partitionsToPurchase: The number of partitions of the loan to purchase.

When a loan is approved and as long as there are partitions available to purchase it can be funded by lenders. The loan will go to the status FUNDING from the first successful fundLoan transaction that is made. In this transaction lending tokens will be sent from the lender to the escrow and in exchange the lender will get as much loan NFT’s as the partitions he purchased. If the last partition is purchased, the loan will automatically go to status STARTED, the first milestone period will be set and the lending tokens for the first milestone are transferred from the escrow to the borrower.


Registry:applyMilestone
uint256 loanId: The id of the loan.

When a milestone is delivered by a project, the borrower can apply the milestone. The loan will be set to AWAITING_MILESTONE_APPROVAL and a request to approve the milestone will be sent to the Governance.


Governance:voteForRequest
uint256 requestId: The id of the request to vote for.
bool decision: True to approve the request.

Delegators can now vote to approve the milestone approval request. When enough unique delegators have given their approval before the approval duration is expired, the status of the loan will be changed to AWAITING_MILESTONE_APPLICATION again and the lending tokens for the next milestone are liberated from the escrow to the borrower.
If all milestones are completed the loan will be set to AWAITING_REPAYMENT and should be paid back by the borrower.



Governance:challengeRequest
uint256 requestId: The id of the request to challenge.

After the deadline of a milestone approval is reached, anyone could challenge the approval request. If it is the first time a deadline has passed, the time is extended. If the extended time is passed again without an approval of the milestone, the request can be challenged again resulting in the loan going to the DEFAULT state.


Registry:executePayment
uint256 loanId: The id of the loan to repay.

A borrower should repay the loan back after all milestones are reached. He can do so by sending this transaction. The amount of lending tokens that should be paid back (interests and lending amount) will be sent from the borrower into the escrow and the loan will be SETTLED.

Registry:challengeLoan
uint256 loanId: The id of the loan to challenge.

If a borrower did not repay the loan after the deadline of repayment is reached, anyone could challenge the loan. If it is the first time a deadline has passed, the time is extended. If the extended time is passed again without repayment, the loan can be challenged again resulting in the loan going to the DEFAULT state.


Registry:receivePayment
uint256 tokenId: The token id of the ERC1155 tokens, which is eligible for the payment.
uint256 amountOfTokens: The amount of tokens to receive payment for.
bool onProjectTokens: Repayment in project tokens or lending token.

When a project loan is settled, the lenders holding loan NFT’s can claim their part of the repayment made by the borrower. Their loan NFT’s will be burned and they will get the corresponding amount of lending tokens back from the escrow.
