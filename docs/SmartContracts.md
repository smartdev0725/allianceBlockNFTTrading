# Smart Contracts
### Governance
Responsible for handling the current delegators as well as voting functionality.

### Registry
Central point of control for the P2P ecosystem. Responsible for starting, approving, rejecting loans, executing payments (e.g. a borrower paying his interest + nominal monthly amount), receiving payments (e.g. a lender collecting the payments based on erc1155 ownership). Users can either request Personal Loans (receive 100% of amount once accepted) or Project Loans (receive loan amount by milestones).

### PersonalLoan
An extension that includes all functionality to do with a personal loan. That includes the logic for calculating and initializing the loan, accepting payments (interest only or nominal + interest) and challenging the personal loan.

### LoanDetails
An extension that includes modifiers and logic to interact with the storage.

### Storage
An extension responsible for storing all the needed mappings for the loans as well as the external contract addresses and contract internal values. E.g. maximum milestones, vesting batches etc..

### ProjectLoan
An extension that includes all functionality to do with a project loan. That includes the logic for calculating and initializing the loan, accepting payments, dealing with milestones, challenging the project loan and accepting payments. Projects receive funds by milestones, that need the Governance to accept the funding each time. In this case, the collateral is the Project own token.

* LoanDetails
Identical to above ^

* Storage
Identical to above ^

### LoanNFT
ERC1155 contract for the representation of the individual parts of a tokenized loan. Each MainNFT(ERC721) can have a list of these assigned to it. The amount of 1155s can be changed based on each loan. The contract is based on OpenZeppelin ERC1155 standard token, with some modifications
* Generation: Token Id is composed of a generation number and a loan Id. 

### MainNFT
ERC721 contract to keep every loan unique. 1:1 per loan

### Escrow
Responsible for keeping all of the NFTs and funds away from the registry itself. No logic in here apart from the ability to withdraw and receive the funds and NFTs.