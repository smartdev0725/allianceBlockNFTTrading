# P2PLINFT

## In a nutshell
AllianceBlock is implementing a decentralized finance model on the principles of participatory capitalism by shifting the functions of validation, rating, and governance from centralized entities to the collective input participants of the ecosystem.

The **Protocol** aims to provide a decentralized infrastructure allowing blockchain-based ([Seeker](Glossary.md#seeker)) projects to receive funding from the platform's users as well as from other p2p lenders that have integrated with [AllianceBlock](https://allianceblock.io). Users providing funding (a.k.a. [Funders](Glossary.md#funder)) for a project receive [Funding NTFs](Glossary.md#funding-nft) that represent investments which can be exchanged for the [Investment tokens](Glossary.md#project-token) at discount, or can be repaid with accrued interest at pre-agreed conditions.

---

## The Protocol

![Protocol Graph](img/protocol.png)

The protocol is comprised of several parts.
* The [Registry subsystem](Registry.md), handles most of the user's interactions at the core of the protocol.
* The [Governance subsystem](DAO.md), handling all **Governance** interactions, the voting process, and updates to the protocol. The *end-to-end* Governance process is documented [here](DAO-endToEnd.md)
* The [Escrow subsystem](Escrow.md), that acts as an independent intermediary, holding the funds and supporting the financial aspect of the protocol.
* The [Storage subsystem](Storage.md), holds the hard data for every investment, project or investment.
* The [Reputation subsystem](Reputation.md), that runs through and affects almost every level of the protocol.

## How it works

The Protocol is backed by audited Smart Contracts that are currently currently being deployed in several blockchains (including Ethereum, BSC, and others). The detailed version can be found [here](Financing.md), but here is an overview:

[Seekers](Glossary.md#seeker) (a.k.a. *Borrowers*) who wish to [**IDO**](Glossary.md#ido) (*Initial DEX Offering*) a Token will apply for an Investment. The [DAO](Governance.md) will vote on whether or not the investment request meets the desired requirements. If the response is positive:


[NFTs](Glossary.md#funding-nft) are used as to represent ownership of a [Funder](Glossary.md#funder) (the user who invests or lends **USDC**/**USDT**/**DAI**), and to stake in the protocol’s governance.


* The [Seekers](Glossary.md#seeker) will lock their **IDO** Tokens within [the escrow](Escrow.md).
* [Funders](Glossary.md#funder) are invited to a lottery that will determine their chances of partaking in the investment opportunity. The chances are defined by a combination of the amount of [Staking](Glossary.md#staking) and [Reputation](Reputation.md) that each participant holds.
* Winners of [the lottery](Glossary.md#ticket-lottery) they will get NFT Notes representing the partitions in the *investment* they funded, making them eligible to claim the **IDO Tokens**.

---

* Read more about the stages for [Financing](Financing.md) and *Investment Mechanics*.
* For any definitions you may need, check out our [Glossary](Glossary.md)
* There is also a *FAQ* section [here](FAQ.md)
