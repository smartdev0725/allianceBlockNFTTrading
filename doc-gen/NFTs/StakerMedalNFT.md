## `StakerMedalNFT`

NFTs that will be held by users as a Medals


Extends Initializable, ERC1155Upgradeable

### `onlyMinter()`





### `onlyAllowedStakingType(uint256 stakingId)`






### `initialize()` (external)

Initializes the contract



### `mint(address to, uint256 stakingId)` (public)

Mint tokens




### `burn(address account, uint256 stakingId)` (public)

Burns tokens




### `safeTransferFrom(address _from, address _to, uint256 _id, uint256 _value, bytes _data)` (public)

Transfers `_value` amount of an `_id` from the `_from` address to the `_to` address specified (with safety call).
        @dev Method disabled
        MUST revert Method disabled.
        @param _from    Source address
        @param _to      Target address
        @param _id      ID of the token type
        @param _value   Transfer amount
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`



### `safeBatchTransferFrom(address _from, address _to, uint256[] _ids, uint256[] _values, bytes _data)` (public)

Transfers `_values` amount(s) of `_ids` from the `_from` address to the `_to` address specified (with safety call).
        @dev Method disabled
        MUST revert Method disabled
        @param _from    Source address
        @param _to      Target address
        @param _ids     IDs of each token type (order and length must match _values array)
        @param _values  Transfer amounts per token type (order and length must match _ids array)
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`



### `getLevelOfStaker(address account) → uint256` (external)

Get the level of some staker address
        @param account  Staker address
        @return level of the staker, 1, 2 or 3. 0 if nothing




