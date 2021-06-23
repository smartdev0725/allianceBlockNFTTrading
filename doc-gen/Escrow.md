## `Escrow`

Responsible for handling the funds in AllianceBlock's ecosystem.


Extends Initializable, EscrowDetails, OwnableUpgradeable, ERC1155HolderUpgradeable


### `initialize(address lendingToken_, address fundingNFT_)` (external)


Initialize


Initializes the contract.


### `afterInitialize(address registryAddress_, address actionVerifierAddress_, address stakingAddress_)` (external)

After Initialize


To be executed after Initialize
requires not already initialized


### `transferFundingNFT(uint256 investmentId, uint256 partitionsPurchased, address receiver)` (external)

Transfer Funding NFT


This function is used to send the ERC1155 tokens from escrow to the lenders.


### `transferLendingToken(address seeker, uint256 amount)` (external)

Transfer Lending Token


This function is used to send the lended amount to the seeker.


### `transferInvestmentToken(address investmentToken, address recipient, uint256 amount)` (external)

Transfer Investment Token


This function is used to send the investment token amount to the seeker.



### `multiMintReputationalToken(address[] recipients, uint256[] amounts)` (external)

Multi Mint Reputation Token


This function is used to multi mint reputational tokens.


### `mintReputationalToken(address recipient, uint256 amount)` (external)

Mint Reputation Token


This function is used to mint reputational tokens.


### `burnReputationalToken(address from, uint256 amount)` (external)

Burn Reputation token


This function is used to burn reputational tokens.


### `changeRegistry(address registryAddress)` (external)

Change Registry


This function is used to change the registry address in case of an upgrade.



