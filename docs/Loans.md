# Loan mechanics

## Loan Creation Process

### Loan Request
It is important to know that the borrower himself will trigger the transaction which creates the request and mints the ERC1155 tokens.
The amount of ERC1155 tokens depends on the base amount price for each token.
The tokens are still locked at the beginning and cannot be purchased until they are validated.

So, the borrower is managing the following:
* Provides the collateral for the loan.
* Provides the amount of stable coins needed for lending.
* Provides the frequency of batch payments that will be settled by him.
* Provides the amount of batch payments that will be settled by him.
* Stakes an amount of ALBT, which is proportional to the requested amount.

**Note: For safety collateral’s value should be at least 150% more than the requested lending amount’s value.** 

## Loan Creation Steps
1. Loan request by borrower.
2. Loan validation by governance layer.

After ERC1155 tokens are minted by the borrower, DAO (ALBT holders) decides if the loan request is valid and approves the loan request.
This action unlocks the ERC1155 tokens, so they can be purchased by the lenders and also returns the staked ALBT back to the borrower.

There is an expiration period for approval and when time is reached a decision is being taken democratically.

In approving step ALBT stakers (governors) are locking their ALBTs alongside with their vote (true for approval, false for not approval) till expiration date.
When this date is reached, if more votes are approvals, the loan request is getting approved and on the opposite occasion the loan request is getting rejected.

In case DAO decides that loan request is not valid, the staked ALBT amount borrower provided to request the loan is being distributed to the DAO holders or getting burnt.


Here there is a case that the borrower is a project needing funds, which provides as collateral the tokens of the project.
In this case there will be an option for DAO to decide whether those tokens alongside with locked funds (as usually when a borrower is a project, lending amount is provided in batches/milestones) will be used for providing liquidity in a decentralized exchange.






### Payment Choices
There are three main parts where choices should be made at the loan creation.

**The first part is about how batch payments will be done.**
There are two cases:
1. Every time a batch payment is being done, the borrower is repaying the part of the nominal alongside with the part of the interest corresponding to this specific batch.
2. Every time a batch payment is being done, the borrower is repaying only the part of the interest corresponding to this specific batch and at the end of the interest repayment, or in the last batch, all nominal is getting repaid.

To clear things out let’s assume the following:
* Total Nominal to be repaid: 10000 Tokens
* Total Interest to be repaid: 1000 Tokens
* Total Batches: 10

So, in this example the first case goes as follows:

- Total Amount to be repaid: 10000 + 1000 = 11000 Tokens
- Total Amount to be repaid for each batch: 11000 / 10 = 1100 Tokens

The borrower should repay for each batch 1100 Tokens.

The second case goes as follows:
* Total Interest to be repaid for each batch: 1000 / 10 = 100 Tokens

Then, the borrower should repay for each batch 100 Tokens, but at the last batch he should also repay the whole nominal.
* For 9 first batches, the borrower is repaying 100 Tokens.
* For the 10th batch the borrower is repaying: 10000 + 100 = 10100 Tokens.

**The second part is about which asset is used by the borrower to repay the loan.**
There are two cases:
1. Borrower is repaying his loan (nominal alongside with interest) by providing the same asset he borrowed (of course the borrower can use any asset he would like, as a DEX can be used to exchange it for the lending asset).
2. Borrower is repaying his loan by using his collateral.

**The third part is about how the borrower is getting the lending amount.**
There are two cases:
1. Borrower is getting paid the whole lending amount instantly when the amount is provided by lenders.
2. Borrower is getting paid the amount lended in batches (mostly when the borrower is a project).


--- 
First of all, the borrower himself triggers the transaction which creates the request and mints the ERC1155 tokens.
The amount of ERC1155 tokens depends on the base amount price for each token.
The tokens are still locked at the beginning and cannot be purchased until they are validated.

So, the borrower is managing the following:
Provides the collateral for the loan.
Provides the amount of stable coins needed for lending.
Provides the frequency of batch payments that will be settled by him.
Provides the amount of batch payments that will be settled by him.
Stakes an amount of ALBT, which is proportional to the requested amount.

Note: For safety collateral’s value should be at least 150% more than the requested lending amount’s value.
