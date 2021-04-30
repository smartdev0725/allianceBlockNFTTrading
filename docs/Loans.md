# Loan mechanics

## Loan Creation Process

### Loan Request
It is important to know that the borrower himself will trigger the transaction which creates the loan request and mints the ERC1155 tokens.
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

After ERC1155 tokens are minted by the Escrow, [DAO Delegators](Glossary.md) (ALBT holders) decide whether or not the loan request is valid and approve or deny the loan request.
This action unlocks the ERC1155 tokens, so they can be purchased by the [Funders](Glossary.md). At the same time, the staked ALBT is sent back to the borrower.

There is a limited voting period for approval/dismissal. When the time limit is reached a distributed democratic decision has been made on whether to approve or deny the loan.

While voting, [DAO Delegators](DAO.md) lock their staked ALBTs alongside with their vote (true for approval, false for not approval) untill expiration date is reached.
When this happens the votes are counted. If the majority of the votes are approvals, the loan request is getting approved. If there are not enough votes, then the loan request is rejected.

In the case where [DAO](DAO.md) decides that loan request is not valid, the staked ALBT amount provided by the borrower as collateral to request the loan will distributed to the DAO holders or getting burnt.


In the case that the [borrower project](Glossary.md) provides as collateral the tokens of the project itself, the [DAO](DAO.md) is entitled to decide whether or not those tokens alongside with the locked funds will be used for providing liquidity in a decentralized exchange.


---

## Payment Choices
There are three main aspects where the borrower should make a decision at the loan creation.

### **The first decision is about how batch payments will be done:**
There are two cases:
* Every time a batch payment is being transferred, the borrower is repaying the portion of the nominal alongside with the fraction of the interest corresponding to that specific batch.
* Every time a batch payment is being transferred, the borrower is repaying only the portion of the interest corresponding to this specific batch and at the end of the interest repayment, or in the last batch, all nominal is getting repaid.

To clear things out let’s assume the following:
* Total Nominal to be repaid: 10000 Tokens
* Total Interest to be repaid: 1000 Tokens
* Total Batches: 10

In this example the first case goes as follows:

- Total Amount to be repaid: 10000 + 1000 = **11000 Tokens**
- Total Amount to be repaid for each batch: 11000 / 10 = **1100 Tokens**

The borrower should repay for each batch 1100 Tokens.

On the other hand, the second case goes as follows:
* Total Interest to be repaid for each batch: 1000 / 10 = **100 Tokens**

Then, the borrower should repay for each batch 100 Tokens, but at the last batch he should also repay the whole nominal.
* For 9 first batches, the borrower is repaying **100 Tokens**.
* For the 10th batch the borrower is repaying: 10000 + 100 = **10100 Tokens**.

### **The second decision is about which asset is used by the borrower to repay the loan:**
There are two alternatives:
1. The Borrower is repaying their loan (nominal alongside with interest) by providing the same borrowed asset (of course the borrower can use any asset, as long as the DEX can be used to exchange it for the lending asset).
2. The Borrower is repaying the loan by using the provided collateral.

### **The third decision is about how the borrower is getting the lending amount:**
There are two options:
1. The Borrower is getting paid the whole lending amount instantly when the amount is provided by lenders.
2. Borrower is getting paid the amount lended in batches (this is how it usually works for [Project Loans](Glossary.md)).
