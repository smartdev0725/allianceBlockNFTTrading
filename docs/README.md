# P2PLINFT

## In a nutshell
AllianceBlock is implementing a decentralized finance model on the principles of participatory capitalism by shifting the functions of validation, rating, and governance from centralized entities to the collective input participants of the ecosystem.

The **Protocol** aims to provide a decentralized infrastructure allowing blockchain-based ([Seeker](Glossary.md#seeker)) projects to receive funding from the platform's users as well as from other p2p lenders that have integrated with [AllianceBlock](https://allianceblock.io). Users providing funding (a.k.a. [Funders](Glossary.md#funder)) for a project receive [Funding NTFs](Glossary.md#funding-nft) that represent investments which can be exchanged for the [Investment tokens](Glossary.md#investment-token) at discount, or can be repaid with accrued interest at pre-agreed conditions.

## How it works

The Protocol is backed by audited Smart Contracts that are currently currently being deployed in several blockchains (including Ethereum, BSC, and others).
Here is an overview on the protocol mechanics:

First, [Seekers](Glossary.md#seeker) (a.k.a. *Borrowers*) who wish to [**IDO**](Glossary.md#ido) (*Initial DEX Offering*) a Token will apply for an Investment. Then [DAO](Governance.md) will vote on whether or not the [investment request](Glossary.md#request-investment) meets the desired requirements. If the response is positive, users are invited to [subscribe](Glossary.md#subscribing) their [funds](Glossary.md#investment-funds), in effect declaring their intent to invest in the [IDO](Glossary.md#ido). We recognize that most of the projects that will get listed by the DAO will be very attractive, so the protocol leverages a `luck` component. To even the odds of becoming [Funders](Glossary.md#funder), users participate in a [lottery](Glossary.md#investment-ticket-lottery). The chances of each user for becoming a [Funder](Glossary.md#funder) are determined by the amount of [Reputation](Reputation.md) they have. A user may win several [Funder Tickets](glossary.md#funder-ticket), which will increase their stake in the [investment opportunity](Glossary.md#ido). [NFTs](Glossary.md#funding-nft) are used as to represent ownership of a [Funder](Glossary.md#funder) (the user who invests or lends **USDC**/**USDT**/**DAI**), and to stake in the protocol’s governance. [Funders](Glossary.md#funder) are then invited to trade their [NFTs](Glossary.md#funding-nft) in exchange for the [IDO Tokens](Glossary.md#ido) they invested in.


### In short:

* The [Seekers](Glossary.md#seeker) will lock their **IDO** Tokens within [the escrow](Escrow.md) when they apply for [Governance](DAO.md) review.
* [Funders](Glossary.md#funder) are invited to a lottery that will determine their chances of partaking in the investment opportunity. The chances are defined by a combination of the amount of [Staking](Glossary.md#staking) and [Reputation](Reputation.md) that each participant holds.
* Winners of [the lottery](Glossary.md#ticket-lottery) they will get [NFT Notes](Glossary.md#funding-nft) representing the partitions in the [investment](Glossary.md#ido) they funded, making them eligible to claim the **IDO Tokens**.

---

## The Protocol

![Protocol Graph](img/protocol.png)

The protocol is comprised of several parts.
* The [Registry subsystem](Registry.md), handles most of the user's interactions at the core of the protocol.
* The [Governance subsystem](DAO.md), handling all **Governance** interactions, the voting process, and updates to the protocol. The *end-to-end* Governance process is documented [here](DAO.md)
* The [Escrow subsystem](Escrow.md), that acts as an independent intermediary, holding the funds and supporting the financial aspect of the protocol.
* The [Storage subsystem](Storage.md), holds the hard data for every investment, project or investment.
* The [Reputation subsystem](Reputation.md), that runs through and affects almost every level of the protocol.


---

* Read more about the stages for [Financing](Financing.md) and *Investment Mechanics*.
* For any definitions you may need, check out our [Glossary](Glossary.md)
* There is also a *FAQ* section [here](FAQ.md)
* There is an automated documentation for each function [here](../doc-gen/README.md)
* There is a Smart Contract inheritance graph [here](img/mvp-inheritance-graph.png)