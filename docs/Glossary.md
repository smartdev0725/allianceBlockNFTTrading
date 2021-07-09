# Glossary


## Smart Contracts
According to [investopedia](https://www.investopedia.com/terms/s/smart-contracts.asp), a smart contract is a self-executing piece of code that renders transactions traceable, transparent, and irreversible within the blockchain. Smart contracts permit trusted transactions and agreements to be carried out among disparate, anonymous parties without the need for a central authority, legal system, or external enforcement mechanism.

## Funder
Funders (a.k.a. *Investors*) are individuals who seek to make an investment in an [IDO](Glossary.md#ido)

## Seeker
Seekers (a.k.a. *Borrowers*) are the individuals looking for **Funders** to invest in their tokens, and they do so by [requesting an investment](Glossary.md#request-investment).

## Request Investment
A **Funding Request** or **Request for Investment** is the first step in the process by which a [Seeker](Glossary.md) solicits the necessary funding for their [Investment IDO](Glossary.md#ido). See [Financial](Financing.md) for more information on this process.

## Hard Data
The basic information required for the **Governance** system to perform their *Due Diligence*. This usually requires the **Borrower** or **Seeker** to provide verifiable documentation regarding their company, project's nature, and individuals related to the transactions. This information must be uploaded to IPFS by the [Seeker](Glossary.md#seeker), alongside with the Investment's goals.

## TGE
Initially, the term "ICO", which refers to "initial coin offering", was used to refer to the initial release of cryptocurrency tokens to the public as a fundraising mechanism. However, due to regulatory concerns of ICO being modeled after IPO (Initial Public Offering) and its implication as an investment vehicle, some projects begun coining different naming conventions. **Token Generation Event (*TGE*)** is one such convention. See [IDO](Glossary.md#ido) for an explanation on an *Initial Dex Offering*

## Minting
**Minting** is the blockchain-based transaction that generates a token. This is also sometimes wrongly called a **TGE**.

## Escrow
The [**Escrow Subsystem**](Escrow.md) or **Escrow**, is responsible for handling the funds in the protocol's ecosystem.

## ERC-1155
A digital token standard that can be used to create both fungible and non-fungible assets.

## ERC-721
A digital token standard that can be used to create non-fungible assets.

## ERC-20
A digital token standard that is used for fungible tokens, such as **DAI** and **USDT**

## Fungible / Non-Fungible assets
Fungibility is an asset’s interchangeability with other individual goods or assets of the same type. In other words, every *Fungible* asset is interchangeably (i.e. same denomination dollar bills), while *Non-Fungible* assets are all unique (i.e. collectibles)

## IDO
An *Initial DEX Offering* is similar to an **ICO** or **IPO**, but is based on a Distributed Exchange

## Reputation
*Reputation* is earned by performing **actions**, completing quests and participating in the protocol. *Reputation* is represented by the [rALBT](Reputation.md) token.

## Actions
Users can earn **Reputation** by performing these actions
* Applying for an Investment [IDO](Glossary.md#ido)
* Locking their investment (instead of instantly claiming)
* Staking *ALBT*
* Signing messages
* Upvoting / Downvoting Investment opportunities
* Commenting on threads or creating new ones
* Sharing Investment Opportunities and helping them reach more people
* Broadcasting messages on-chain (paying gas fees)
* Playing mini-games (like Trivia)

## Investment Funds
The assets a **Funder** utilizes to support an **Investment**. The protocol requires them to be a [Lending Token](Glossary.md#lending-token). See [Financial](Financing.md) for more information on this process.

## Lending token
The lending token is the token the [Funders](Glossary.md#funder) use to pay for their investments. In other words, this is the token the [Seeker](Glossary.md#seeker) receives  when the investment is financed. For the moment the **lending token** must be an ERC20 token.

## Funding NFT
The *ERC-1155 NTF* representing the notes given to [Funders](Glossary.md#funder) by the [Escrow](Escrow.md) in exchange for their [Investment Funds](Glossary.md#investment-funds).

The **Funding NFT** is the token to represent the parts of an investment by the [Funders](Glossary.md#funder) and makes holders of this token eligible to claim their respective payments after the [IDO](Glossary.md#ido) is over.

## Investment tokens
The tokens a *Seeker* will deposit in the **Escrow** when the [IDO](Glossary.md#ido) is approved. In other words, these are the tokens that are offered for sale. See [Financial](Financing.md) for more information on this subject.

## Listing
When an [Investment IDO](Glossary.md#ido) becomes *Listed*, it means that its [Hard Data](Glossary.md#hard-data) has been approved by the **Governance**, and it should be published on the website. The investment opportunity then becomes available for [Funders](Glossary.md#funder) to subscribe to.

## Investment Rating
A *Investment's Rating* represents the collective user's opinion about it. *The Wisdom of Crowds* by **AllianceBlock** means that each user's **Reputation** plays a role as important as their opinion on an *Early Stage Project*. It is more than the average of the individual scores: The added value comes from the feelings expressed in the users' comments.

## Subscribing
A **Subscription** is a declaration of intent made by a **Funder** who is interested in buying a part of the [IDO](Glossary.md#ido). When a **Funder** decides to partake in an [Investment IDO](Glossary.md#ido) they will first have to *Subscribe*.

## Partition
A **Partition** is a portion of the **Investment** offered by the [Seeker](Glossary.md#seeker). For example, if a **Seeker** offers 100k tokens in their [IDO](Glossary.md#ido) as an **investment opportunity**, they may choose to partition it in chunks of 10k [Investment Tokens](Glossary.md#investment-tokens) each. This would result in *10 Partitions* being offered to [Subscribers](Glossary.md#subscribing) to invest in. In order to be able to invest and pay for a **Partition**, a **Subscriber** must first earn a [Funder Ticket](Glossary.md#funder-ticket).

## Funder Ticket
A **Funder Ticket** represents a tangible opportunity to invest in a fraction of an [Investment IDO](Glossary.md#ido). Each *listed investment* will have **Funder Tickets** to distribute among the [Subscribers](Glossary.md#subscribing). All of the tickets for an Investment will have the same value. The next equations apply:

* **ticket_Price x #total_tickets = investment_funds**

* [**#total_partitions**](Glossary.md#partition) = **#funder_tickets**

This means that the sum of funds required by the **Seeker** is equal to the number of tickets multiplied by the ticket price, and that the amount of [Partitions](Glossary.md#partition) is equal to the amount of **Funder tickets** available.

Note that not all [Funders](Glossary.md#funder) who *subscribe* are eligible to invest in an [Investment IDO](Glossary.md#ido). Only **Funders** with a **Funder ticket** are eligible. In order to earn one, they must win the [Ticket Lottery](Glossary.md#investment-ticket-lottery).

## Investment Ticket Lottery
Some investment opportunities are very popular, requiring a mechanism to even the odds between potential **Funders**. This mechanism distributes **Funder Tickets** among the **Subscribed Funders** for every **Tier**. The user's **Reputation** heavily influences the chances they have of securing a ticket.

## Participation Tier
The amount of staked **ALBT** a user chooses to lock defines the *Tiers* they will participate in. Different *Tiers* run different probabilities of earning an **Investment Ticket**. Each *Tier* comes with its own **Tier NFT**.

## Tier NFT
This NFT is not tradeable and represents the amount of **ALBT** staked by the user. It earns **Reputation** and allows the user to participate in the **Investment Ticket Lottery** with perks depending on the current user's level.
The *Tier NFT* may be **Bronze NFT**, **Silver NFT**, or **Gold NFT**.

## Reputation level
As the *Protocol* matures, the **DAO** will enable the *Reputation Leveling System*. This will extend the [Reputation Subsystem](Reputation.md) with a leveling score for each user. The 7 levels will range from *Junior* to *Grand Master*.

## Storage
[**Storage Subsystem**](Storage.md) or **Storage** is responsible for holding all the information. It stores the variables for every [Investment IDO](Glossary.md#ido) as well as the active roles for the [Governance](DAO.md).



