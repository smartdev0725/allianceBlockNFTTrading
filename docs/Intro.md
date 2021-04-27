# P2PLINFT
First the different token contracts and interfaces that are implemented and/or used are described to understand the tokenomics. Tokens are used as collateral, to give out and pay back loans, to represent ownership of a lender and to stake to take part in the protocol’s governance.
Then the contracts that orchestrate the interactions between these different tokens and between different actors will be presented as well to understand the complete flow and know all available (external) transactions.

![Protocol Graph](img/protocol.png)

The code of the smart contracts that is currently developed for the p2p, decentralized lending platform permits borrowers to request a personal loan or a loan for a project.
Both will follow these steps:
* As a guarantee, collateral tokens of the borrower will be deposited in escrow when requesting the loan.
* Dao delegators can then vote to approve the loan requests.
Once a loan is approved, lenders can fund the loan by transferring lending tokens they hold.
* In exchange they will get loan NFT Notes representing the partitions of the loan they funded and making them eligible to claim the repayments of the loan with interest.

The total amount of a personal loan, once completely funded, is fully available to the borrower and can be paid back in batches. On the other hand, project loans will only get a part of the loan for every project milestone that gets delivered. Delegators have to vote to accept the delivery of a milestone. Repayment of project loans is done in one part of the total amount of the loan with interests once all milestones are delivered.
When a borrower does not comply with paying the repayment batches on time or if a project does not deliver a milestone in the agreed upon time, the loan can be challenged which can lead to loss of the collateral token for the borrower.