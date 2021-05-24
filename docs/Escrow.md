# Escrow Subsystem

The **Escrow Subsystem** is composed by two main [Smart Contracts](Glossary.md#smart-contracts):
* EscrowDetails.sol
* Escrow.sol

The first is used as storage for the information regarding the minting of [Funding NFTs](Glossary.md#funding-nft).

The second contract (**Escrow.sol**) is responsible for handling the funds in the protocol's ecosystem. For example, if a user becomes a [Funder](Glossary.md#funder), they send their assets to be locked within the **Escrow** subsystem. In exchange, **Funders** receive the [ERC-1155 Funding tokens](Glossary.md#erc-1155) sent by the **Escrow**.

When *Seekers* request a [Personal Loan](Glossary.md#personal-loan) the **Escrow** will send them the borrowed funds.

This subsystem is closely tied to the [Registry Subsystem](Registry.md).

The **Escrow** also manages the [Main NFT](Glossary.md#main-nft) and the [Investment Funds](Financing.md).