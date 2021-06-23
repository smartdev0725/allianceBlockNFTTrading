## `FundingNFT`

NFTs that will be held by users


Extends Initializable, ContextUpgradeable, AccessControlUpgradeable, ERC1155Upgradeable

### `onlyPauser()`





### `onlyMinter()`






### `initialize(string baseUri, string contractUri)` (external)


Initializes the contract




### `contractURI() → string` (public)

contract metadata




### `pauseTokenTransfer(uint256 investmentId)` (external)

Pauses the token transfers


Owner can pause transfers for specific tokens
pauses all investment ids, no matter the generation



### `unpauseTokenTransfer(uint256 investmentId)` (external)

Unpauses the token transfers


Owner can unpause transfers for specific tokens


### `mintGen0(address to, uint256 amount, uint256 investmentId)` (external)

Mint generation 0 tokens




### `mintOfGen(address to, uint256 amount, uint256 generation, uint256 investmentId)` (external)

Mint tokens of a specific generation directly




### `decreaseGenerations(uint256 tokenId, address user, uint256 amount, uint256 generationsToDecrease)` (external)

Decrease generations of a token


token is burned, and new token is minted to user
token owner should have approvedForAll before calling this function


### `increaseGeneration(uint256 tokenId, address user, uint256 amount)` (external)

increase generation of a token


token is burned, and new token is minted to user
token owner should have approvedForAll before calling this function


### `increaseGenerations(uint256 tokenId, address user, uint256 amount, uint256 generationsToAdd)` (external)

increase generations of a token


token is burned, and new token is minted to user
token owner should have approvedForAll before calling this function


### `burn(address account, uint256 id, uint256 amount)` (public)

Burns tokens




### `_increaseGenerations(uint256 tokenId, address user, uint256 amount, uint256 generationsToAdd)` (internal)

increase multiple generations of a token


token is burned, and new token is minted to user
token owner should have approvedForAll before calling this function


### `_decreaseGenerations(uint256 tokenId, address user, uint256 amount, uint256 generationsToDecrease)` (internal)

decrease multiple generations of a token


token is burned, and new token is minted to user
token owner should have approvedForAll before calling this function


### `_beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data)` (internal)

Runs checks before transferring a token


Validates if the investmentId from the tokenId can be transferred and not paused



### `GenerationIncreased(uint256 investmentId, address user, uint256 newGeneration)`





### `GenerationDecreased(uint256 investmentId, address user, uint256 newGeneration)`





### `TransfersPaused(uint256 investmentId)`





### `TransfersResumed(uint256 investmentId)`





