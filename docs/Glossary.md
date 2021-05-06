# Glossary


## Smart Contracts
According to [investopedia](https://www.investopedia.com/terms/s/smart-contracts.asp), a smart contract is a self-executing piece of code that renders transactions traceable, transparent, and irreversible within the blockchain. Smart contracts permit trusted transactions and agreements to be carried out among disparate, anonymous parties without the need for a central authority, legal system, or external enforcement mechanism.

## Funder
Funders (a.k.a. *Investors*) are the individuals who seek to make an investment by funding a project or loan.

## Borrower
Borrowers (a.k.a. *Seekers*) are the projects or individuals looking for **Funders** to invest in their projects (or loans). They do so by **Requesting Funding**.

## Request Investment
**Funding Request** or **Request for Investment** is the first step in the process by which **Borrowers** solicit the necesary funding for their **Project** or **Loan**. See [Financial](Financing.md) for more information on this process.

## Hard Data
The basic information required for the **Governance** system to perform their *Due Dilligence*. This usually requires the **Borrower** or **Seeker** to provide verifiable documentation regarding their company, project and individuals related to the transactions.

## TGE
*TGE* or **Token Generation Event** is the blockchain-based transaction that generates a token. This is also sometimes called **minting**

## Personal Loan
A *Personal Loan* is one made by an individual *Borrower*. This works similarly to the loans granted by the classic bank institutions:
1. A person (the *Borrower*) would request financial support to a bank and provide some *Collateral* in exchange for the funds required.
2. The bank would review the case and decide whether or not to grant the request
3. If granted, the *Borrower* would receive the funds and repay them following a pre-arranged schedule.

## Collateral
The assets provided by *Borrowers* as a guarantee that they will repay their debt.

## Escrow
The [**Escrow Subsystem**](Escrow.md) or **Escrow**, is responsible for handling the funds in the protocol's ecosystem.

## ERC-1155
A digital token standard that can used to create both fungible and non-fungible assets.

## ERC-721
A digital token standard that can used to create non-fungible assets.

## Fungible / Non-Fungible assets
Fungibility is an asset’s interchangeability with other individual goods or assets of the same type. In other words, every *Fungible* assets is interchangeably (i.e. same denomination dollar bills), while *Non-Fungible* assets are all unique (i.e. collectibles)

## Main NFT
The *ERC-721 NFT* representing a *Project*, wrapping the **Funding NFT**. Each *Main NFT* is unique as it holds relevant information regarding the listing.

## Funding NFT
The *ERC-1155 NTF* representing the notes given to *Funders* by the *Escrow* in exchange for their **Investment Funds**.

## Investment Funds
The assets a **Funder** utilizes to support a *Project* or *Loan*. See [Financial](Financing.md) for more information on this process.

### Collateral token
The collateral token is the token a borrower should deposit as a guarantee for the lenders in case the loan is not repaid on time or when other agreements are not fulfilled. Any ERC20 token can be used as collateral. In the transaction(s) for requesting a loan (function requestPersonalLoan in PersonalLoan.sol or function requestProjectLoan in ProjectLoan.sol), the borrower itself can choose the ERC20 token and the amount to use as collateral. The contract will then transfer the specified amount of the token to the escrow contract.
When the loan is rejected by the governance, the collateral token will be sent back to the borrower (function decideForLoan in Registry.sol)

### Lending token
The lending token is the token the loans are given out in, in other words, this is the token the borrower receives from the lenders when the loan is accepted. For the moment the lending token is an ERC20 token and is set in the deployment of the contracts (constructor of Registry.sol), so all loans will be given out in the same specific token.

After a loan is accepted, lenders can fund a loan (function fundLoan in Registry.sol), this will take the amount of lending tokens they want to lend and deposit them into the escrow contract. Once a loan is fully funded, the loan will be started and the lending tokens will be sent from the escrow to the borrower.

The borrower should pay the lending token back in the established repayment times (function executePayment in Registry.sol). These payments will send the lending token from the borrower back into the escrow. A lender can then claim back his part of the loan from the escrow (function receivePayment in Registry.sol).

### Loan NFT
The loan NFT is the token to represent the parts of a loan given by lenders and makes holders eligible to claim the loan payments.

This token is implemented in the LoanNFT.sol contract and is an ERC1155 token so different loans can be managed by the same contract and every loan can be split up in partitions for different lenders to hold.

The tokens are minted at the time a loan is requested (function requestPersonalLoan in PersonalLoan.sol or function requestProjectLoan in ProjectLoan.sol). This first emission of loan NFT’s will be from what is called generation 0 and gives the right to claim the first repayments. Every time a payment is claimed by a lender, the loan NFT’s of the partition he claimed will be burned and loan NFT’s of a next generation will be minted (function receivePayment in Registry.sol).

The tokens are paused until the loan is approved (function decideForLoan in Registry.sol)
When a loan is funded by a lender, loan NFT tokens are transferred from the escrow contract to the lender (function fundLoan in Registry.sol).

### Project tokens
The tokens a *Seeker* will deposit in the **Escrow** when the *Project* is approved. See [Financial](Financing.md) for more information on this subject.

## Listing
When a **Project** or **Loan** becomes *Listed*, it means that it's **Hard Data** has been approved by **Goverannce** and it should be published in the website and available for **Funders** to subscribe to.

## Subscribing
A **Subscription** is a declaration of intent made by a **Funder**. When a **Funder** decides to invest in a **Project** or **Loan**, they will first have to *Subscribe*.

## Funder Ticket
Not all **Funders** who *subscribe* are elligible to invest in a **Project** or **Loan**. Only **Funders** with a *Funder ticket* are elligible. In order to earn one, they must win the **Ticket Raffle**.

## Ticket Raffle
Some investment opportunities are very popular, requiring a mechanism to even the odds between potential **Funders**. This mechanism distributes **Funder Tickets** among the **Subscribed Funders**

## Partition:
EXPLANATION HERE

## Milestone
Each successful *Project* is required to have a set of *Milestones* or goals. If the *Project* is listed, the total required funds will be granted in steps, as each *Milestone* is reached and verified by **Governance**.

## Storage
[**Storage Subsystem**](Storage.md) or **Storage** is responsible for holding all the information. It stores the variables for every investment, loan and project as well as the active roles for the [Governance](DAO.md).

## Discount Rate
Convertible notes are set up to convert to preferred stock at the next equity round at a "discount". This rewards early stage investors for taking more risk than the later investors. A typical conversion discount is 20%.

## Valuation Cap
Maximum valuation allowed for the startup for the purpose of conversion to preferred stock, regardless of what the valuation of the startup is at the time of the next priced equity round. This protects the early investors by making sure they retain a reasonable percentage of ownership even if the startup becomes much more valuable later on.

## Interest rate
The interest is not paid out but accrued until the first priced round, at which point the interest is converted to shares the same like the principal for the loan.

## Maturity date
This denotes the date on which the note is due, at which time the company needs to repay it.

## Amount
Denotes how much money will be lended.

## Closing date
Date on which the money will be provided to the startup/entrepreneur.

## Conversion
Describes when and how the loan amount converts into ownership (shares)

* Automatic: When in the future, when there is an “equity round” where investors prevalue the startup, which determines the value of the share. Investors are buying stock in the company to make an investment

* Optional:  Occurs when the loan has reached the maturity and there was no equity investment


## Network participants:
| DAO Actors     | How to become                                                                              | Function                                                                                                                                                                                                             | Incentives                                                                                                                             |   |
|----------------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|---|
| ALBT Stakers   | Stake 5000 Every user who is willing to stake ALBT tokens                                  | - secure the network                                                                                                                                                                                                 | - receive the network fees                                                                                                             |   |
| DAO Members    | Stake 50000 ALBT Request the smart contract to receive a non-tradable DAO token 50 Members | - vote on DAO delegators                                                                                                                                                                                             | - receive the network fees - receive the fraction of generated interests                                                               |   |
| DAO Delegators | Stake 250000 ALBT 11 DAO Members with highest vote number                                  | - provide assistance in project onboarding - reviewing the business plan - Request for funding advisory - voting on project funding - voting on tranche unlocking - voting on reaching the Maturity Date decisions   | - receive the network fees - receive the fraction of generated interests  - receive the fraction of initial fee paid by the project    |   |
| DAO Substitute | Stake ALBT DAO Members with highest vote number starting from 11 place on the leaderboard  | - jumps in as a substitute for a lazy voter                                                                                                                                                                          | - receive the network fees - receive the fraction of generated interests - receive additional fees when promoted to Delegator or Juror |   |

---

