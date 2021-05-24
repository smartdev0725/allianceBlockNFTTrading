# Glossary


## Smart Contracts
According to [investopedia](https://www.investopedia.com/terms/s/smart-contracts.asp), a smart contract is a self-executing piece of code that renders transactions traceable, transparent, and irreversible within the blockchain. Smart contracts permit trusted transactions and agreements to be carried out among disparate, anonymous parties without the need for a central authority, legal system, or external enforcement mechanism.

## Funder
Funders (a.k.a. *Investors*) are individuals who seek to make an investment by funding a project or loan.

## Seeker
Seekers (a.k.a. *Borrowers*) are the projects or individuals looking for **Funders** to invest in their projects (or loans). They do so by **Requesting Funding**.

## Request Investment
**Funding Request** or **Request for Investment** is the first step in the process by which **Seekers** solicit the necessary funding for their **Project** or **Loan**. See [Financial](Financing.md) for more information on this process.

## Hard Data
The basic information required for the **Governance** system to perform their *Due Diligence*. This usually requires the **Borrower** or **Seeker** to provide verifiable documentation regarding their company, project, and individuals related to the transactions.

## TGE or Token Generation Event
Initially, the term "ICO", which refers to "initial coin offering", was used to refer to the initial release of cryptocurrency tokens to the public as a fundraising mechanism. However, due to regulatory concerns of ICO being modeled after IPO (Initial Public Offering) and its implication as an investment vehicle, some projects begun coining different naming conventions. **Token Generation Event (*TGE*)** is one such convention.

## Minting
**Minting** is the blockchain-based transaction that generates a token. This is also sometimes wrongly called a **TGE**.

## Personal Loan
A *Personal Loan* is one made by an individual *Seeker*. This works similarly to the loans granted by the classic bank institutions:
1. A person (the *Seeker*) would request financial support to a bank and provide some *Collateral* in exchange for the funds required.
2. The bank would review the case and decide whether or not to grant the request
3. If granted, the *Seeker* would receive the funds and repay them following a pre-arranged schedule.

## Collateral
The assets provided by *Seekers* as a guarantee that they will repay their debt.

## Escrow
The [**Escrow Subsystem**](Escrow.md) or **Escrow**, is responsible for handling the funds in the protocol's ecosystem.

## ERC-1155
A digital token standard that can be used to create both fungible and non-fungible assets.

## ERC-721
A digital token standard that can be used to create non-fungible assets.

## Fungible / Non-Fungible assets
Fungibility is an asset’s interchangeability with other individual goods or assets of the same type. In other words, every *Fungible* asset is interchangeably (i.e. same denomination dollar bills), while *Non-Fungible* assets are all unique (i.e. collectibles)

## Main NFT
The *ERC-721 NFT* representing a *Project*, wrapping the **Funding NFT**. Each *Main NFT* is unique as it holds relevant information regarding the listing.

## Funding NFT
The *ERC-1155 NTF* representing the notes given to *Funders* by the *Escrow* in exchange for their **Investment Funds**.

## Reputation (rALBT)
*Reputation* is earned by performing actions, completing quests and participating in the protocol. *Reputation* is represented by the [rALBT](RALBT.md) token.

## Investment Funds
The assets a **Funder** utilizes to support a *Project* or *Loan*. See [Financial](Financing.md) for more information on this process.

## Collateral token
The collateral token is the token a *Seeker* should deposit as a guarantee for the lenders in case the loan is not repaid on time or when other agreements are not fulfilled. Any ERC20 token can be used as collateral. In the transaction(s) for requesting a loan (function requestPersonalLoan in PersonalLoan.sol or function requestProjectLoan in ProjectLoan.sol), the *Seeker* itself can choose the ERC20 token and the amount to use as collateral. The contract will then transfer the specified amount of the token to the escrow contract.
When the loan is rejected by the governance, the collateral token will be sent back to the *Seeker* (function decideForLoan in Registry.sol)

## Lending token
The lending token is the token the loans are given out in, in other words, this is the token the *Seeker* receives from the lenders when the loan is accepted. For the moment the lending token is an ERC20 token and is set in the deployment of the contracts (constructor of Registry.sol), so all loans will be given out in the same specific token.

After a loan is accepted, lenders can fund a loan (function fundLoan in Registry.sol), this will take the number of lending tokens they want to lend and deposit them into the escrow contract. Once a loan is fully funded, the loan will be started and the lending tokens will be sent from the escrow to the *Seeker*.

The *Seeker* should pay the lending token back in the established repayment times (`function executePayment in Registry.sol`). These payments will send the lending token from the *Seeker* back into the escrow. A lender can then claim back his part of the loan from the escrow (`function receivePayment in Registry.sol`).

## Loan NFT
The loan NFT is the token to represent the parts of a loan given by lenders and makes holders eligible to claim the loan payments.

This token is implemented in the LoanNFT.sol contract and is an ERC1155 token so different loans can be managed by the same contract and every loan can be split up in partitions for different lenders to hold.

The tokens are minted at the time a loan is requested (`function requestPersonalLoan in PersonalLoan.sol` or` function requestProjectLoan in ProjectLoan.sol`). This first emission of loan NFT’s will be from what is called generation 0 and gives the right to claim the first repayments. Every time a payment is claimed by a lender, the loan NFT’s of the partition he claimed will be burned and loan NFT’s of a next-generation will be minted (`function receivePayment in Registry.sol`).

The tokens are paused until the loan is approved (`function decideForLoan in Registry.sol`)
When a loan is funded by a lender, loan NFT tokens are transferred from the escrow contract to the lender (`function fundLoan in Registry.sol`).

## Project tokens
The tokens a *Seeker* will deposit in the **Escrow** when the *Project* is approved. See [Financial](Financing.md) for more information on this subject.

## Listing
When a **Project** or **Loan** becomes *Listed*, it means that its **Hard Data** has been approved by **Governance** and it should be published on the website and available for **Funders** to subscribe to.

## Project Rating
A *Project's Rating* represents the collective user's opinion about the Project. *The Wisdom of Crowds* by **AllianceBlock** means that each user's **Reputation** plays a role as important as their opinion on an *Early Stage Project*. It is more than the average of the individual scores. The added value comes from the feelings expressed in the users' comments.

## Subscribing
A **Subscription** is a declaration of intent made by a **Funder**. When a **Funder** decides to invest in a **Project** or **Loan**, they will first have to *Subscribe*.

## Partition
A **Partition** is a portion of the **Investment** or **Project Token** offered by the **Seeker**. For example, if a **Seeker** offers 100k tokens of their **Project Tokens** as an investment opportunity, they may choose to partition it in chunks of 10k **Project Tokens** each. This would result in *10 Partitions* being offered to **Subscribers** to invest in. In order to be able to fund the project and earn a **Partition**, a **Subscriber** must first earn a **Funder Ticket**.

## Funder Ticket
A **Funder Ticket** represents an opportunity to invest in a fraction of a project. Each *listed project* will have **Funder Tickets** to distribute among the *subscribers*. All of the tickets for a project will have the same value. The next equation applies:

* **ticket_Price x #total_tickets = project_funds**

This means that the sum of funds required by the **Seeker** is equal to the number of tickets multiplied by the ticket price.

Note that not all **Funders** who *subscribe* are eligible to invest in a **Project** or **Loan**. Only **Funders** with a *Funder ticket* are eligible. In order to earn one, they must win the **Ticket Lottery**.

## Investment Ticket Lottery
Some investment opportunities are very popular, requiring a mechanism to even the odds between potential **Funders**. This mechanism distributes **Funder Tickets** among the **Subscribed Funders** for every **Tier**. The user's **Reputation** heavily influences the chances they have of securing a ticket.

## Participation Tier
The amount of staked **ALBT** a user chooses to lock defines the *Tiers* they will participate in. Different *Tiers* run different probabilities of earning an **Investment Ticket**. Each *Tier* comes with its own **Tier NFT**.

## Tier NFT
This NFT is not tradeable and represents the amount of **ALBT** staked by the user. It earns **Reputation** and allows the user to participate in the **Investment Ticket Lottery** with perks depending on the current user's level.
The *Tier NFT* may be **Bronze NFT**, **Silver NFT**, or **Gold NFT**.

## Reputation level
As the *Protocol* matures, the **DAO** will enable the *Reputation Leveling System*. This will extend the [Reputation Subsystem](RALBT.md) with a leveling score for each user. The 7 levels will range from *Junior* to *Grand Master*.

## Milestone
Each successful *Project* is required to have a set of *Milestones* or goals. If the *Project* is listed, the total required funds will be granted in steps, as each *Milestone* is reached and verified by **Governance**.

## Storage
[**Storage Subsystem**](Storage.md) or **Storage** is responsible for holding all the information. It stores the variables for every investment, loan, and project as well as the active roles for the [Governance](DAO.md).

## Discount Rate
Convertible notes are set up to convert to preferred stock at the next equity round at a "discount". This rewards early-stage investors for taking more risk than the later investors. A typical conversion discount is 20%.

## Valuation Cap
Maximum valuation allowed for the startup for the purpose of conversion to preferred stock, regardless of what the valuation of the startup is at the time of the next priced equity round. This protects the early investors by making sure they retain a reasonable percentage of ownership even if the startup becomes much more valuable later on.

## Interest rate
The interest is not paid out but accrued until the first priced round, at which point the interest is converted to shares the same as the principal for the loan.

## Maturity date
This denotes the date on which the note is due, at which time the company needs to repay it.

## Amount
Denotes how much money will be lent.

## Closing date
Date on which the money will be provided to the startup/entrepreneur.

## Conversion
Describes when and how the loan amount converts into ownership (shares)

* Automatic: When in the future, when there is an “equity round” where investors pre value the startup, which determines the value of the share. Investors are buying stock in the company to make an investment

* Optional:  Occurs when the loan has reached maturity and there was no equity investment


## Network participants
| DAO Actors     | How to become                                                                              | Function                                                                                                                                                                                                             | Incentives                                                                                                                             |   |
|----------------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|---|
| ALBT Stakers   | Stake 5000 Every user who is willing to stake ALBT tokens                                  | - secure the network                                                                                                                                                                                                 | - receive the network fees                                                                                                             |   |
| DAO Members    | Stake 50000 ALBT Request the smart contract to receive a non-tradable DAO token 50 Members | - vote on DAO delegators                                                                                                                                                                                             | - receive the network fees - receive the fraction of generated interests                                                               |   |
| DAO Delegators | Stake 250000 ALBT 11 DAO Members with highest vote number                                  | - provide assistance in project onboarding - reviewing the business plan - Request for funding advisory - voting on project funding - voting on tranche unlocking - voting on reaching the Maturity Date decisions   | - receive the network fees - receive the fraction of generated interests  - receive the fraction of initial fee paid by the project    |   |
| DAO Substitute | Stake ALBT DAO Members with highest vote number starting from 11 places on the leaderboard  | - jumps in as a substitute for a lazy voter                                                                                                                                                                          | - receive the network fees - receive the fraction of generated interests - receive additional fees when promoted to Delegator or Juror |   |

---


