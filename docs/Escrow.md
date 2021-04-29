# Escrow Subsystem

The Escrow is responsible for handling the funds in the protocol's ecosystem. For example, if a user becomes a [Funder](Glossary.md), they send their assets to be locked as [Collateral](Glossary.md) within the **Escrow** subsystem. In exchange, **Funders** receive the [ERC-1155 tokens](Glossary.md) sent by the **Escrow**.

When borrowers request a [Personal Loan](PersonalLoan.md) the **Escrow** will send them the funds.

The **Escrow** is closely tied to the [Registry Subsystem](Registry.md).