# Registry Subsystem

The **Registry** is the central point of control for the P2P ecosystem. It is responsible for managing every loan transaction. From starting, approving, rejecting loans, executing payments (e.g. a **Seeker** paying his interest + nominal monthly amount) to receiving payments (e.g. a lender collecting the payments based on erc1155 ownership).

On top of that, the **Registry** also stores key information regarding the protocol:

* the base Amount For Each Partition,
* the minimum Interest Percentage,
* the max number of Milestones,
* the milestone Extension Interval,
* the vesting Batches,
* the vesting Time Interval

Through interactions with the Registry, users can either request:
* [Personal Loans](Glossary.md#project-loan) (and receive 100% of the amount once accepted),
* [Project Loans](Glossary.md#project-loan) (and receive loan amount by [milestones](Glossary.md#milestone)),
* to become lenders or investors in projects (and receive project notes, that will redeemable at a later date)

## How Registry works

Since the **Registry** is at the core of the protocol, it interacts directly with every other subsystem.

* The [DAO (Governance Subsystem)](DAO.md) must let the **Registry** know if a loan was accepted or not. It does so by using the `function decideForLoan(...)`.

* When a loan gets approved, it becomes active and it is time to fund the loan. [Funders](Glossary.md#funder) will then be able to call the `function fundLoan(...)`

* When a [Seeker](Glossary.md#seeker) wants to return part of the owed amount for a loan, they will do so by calling the `function executePayment(...)`

* When a [Funder](Glossary.md#funder) (or any holder of the [ERC-1155 tokens](Glossary.md#erc-1155)) wants to cash out their investment to receive a payment after **seeker** has repaid part of the loan, they do so by calling the `function receivePayment(...)`

* For security measures, in case of rules broken by the **seeker**, any address can challenge a loan by calling the `function challengeLoan(...)`

Aside from all those important functions, the **Registry** also controls other important functions, like `_approveLoan(...)`, `_rejectLoan(...)` and `_startLoan(...)`.

Finally, the **Registry** relies on the [**Storage subsystem**](Storage.md) for all these variables and functionalities.


