# Escrow Subsystem

The **Escrow Subsystem** is composed by two main [Smart Contracts](Glossary.md): 
* EscrowDetails.sol
* Escrow.sol

The first is used as storage for the information regarding the minting of NFTs.

The second contract (**Escrow.sol**) is responsible for handling the funds in the protocol's ecosystem. For example, if a user becomes a [Funder](Glossary.md), they send their assets to be locked as [Collateral](Glossary.md) within the **Escrow** subsystem. In exchange, **Funders** receive the [ERC-1155 tokens](Glossary.md) sent by the **Escrow**.

When borrowers request a [Personal Loan](PersonalLoan.md) the **Escrow** will send them the funds.

This subsystem is closely tied to the [Registry Subsystem](Registry.md).

The **Escrow** also manages the [Main NFT](Glossary.md) and the [Funding NFT](Glossary.md).