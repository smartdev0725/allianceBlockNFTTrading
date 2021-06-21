# Registry Subsystem

The **Registry** is the central point of control for the P2P ecosystem. It is responsible for managing every investment transaction. From starting, approving, rejecting [IDOs](glossary.md#ido), executing payments (e.g. a [Seeker](Glossary.md#seeker) paying his interest + nominal monthly amount) to receiving payments (e.g. a lender collecting the payments based on [erc1155](Glossary.md#erc-1155) ownership).

On top of that, the **Registry** also stores key information regarding the protocol:

* the base Amount For Each Investment Partition,
* the Hard Data
* the Investment's goals
* the ids for every current and past [Investment IDOs](Glossary.md#ido)
* the information regarding each [Funder](Glossary.md#funder) and [Seeker](Glossary.md#seeker)

Through interactions with the **Registry**, users can either request:
* an [Investment IDO](Glossary.md#ido) (that will set them in the path of receiving the [Investment funds](Glossary.md#investment-funds) required for their project),
* to become [Fundsrs](Glossary.md#funder) or investors in [IDOs](Glossary.md#ido) (and receive investment notes (AKA [Tickets](Glossary.md#funder-ticket)), that will become redeemable for a portion of the [IDO](Glossary.md#ido))


## How Registry works

Since the **Registry** is at the core of the protocol, it interacts directly with every other subsystem.

* The [DAO (Governance Subsystem)](DAO.md) must let the **Registry** know if an [Investment IDO](Glossary.md#ido) was accepted or not.

* When an [Investment IDO](Glossary.md#ido) gets approved, it becomes active and it is time to fund it. The [Escrow](Escrow.md) plays a key role in this process, holding the funds locked (both the [IDO Tokens](Glossary.md) as well as the [Funder's](Glossary.md)) until it is time for exchanging them.

Finally, the **Registry** relies on the [**Storage subsystem**](Storage.md) for all these variables and functionalities.


