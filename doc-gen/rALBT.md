## `rALBT`



Extends Ownable


### `multiMintTo(address[] to, uint256[] amounts)` (external)

Multi Mint To


Multimints tokens.
Requires valid lists


### `mintTo(address to, uint256 amountToMint)` (external)

Mint To


Mints amountToMint tokens to the sender


### `burnFrom(address from, uint256 amountToBurn)` (external)

Burn From


Burns amountToBurn tokens from the sender


### `name() → string` (public)

Name


Returns the name of the token.

### `symbol() → string` (public)

Symbol


Returns the symbol of the token, usually a shorter version of the
name.

### `decimals() → uint8` (public)

Decimals


Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5,05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
called.

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}.

### `totalSupply() → uint256` (public)

Total Supply


See {IERC20-totalSupply}.

### `balanceOf(address account) → uint256` (public)

Balance Of


See {IERC20-balanceOf}.

### `_mint(address account, uint256 amount)` (internal)

Mint


requires not to zero address
Creates `amount` tokens and assigns them to `account`, increasing
the total supply.

Emits a {Transfer} event with `from` set to the zero address.

Requirements:

- `to` cannot be the zero address.

### `_burn(address account, uint256 amount)` (internal)

Burn


requires not from zero address
Destroys `amount` tokens from `account`, reducing the
total supply.

Emits a {Transfer} event with `to` set to the zero address.

Requirements:

- `account` cannot be the zero address.
- `account` must have at least `amount` tokens.


### `Transfer(address from, address to, uint256 value)`



Emitted when `value` tokens are moved from one account (`from`) to
another (`to`).

Note that `value` may be zero.

