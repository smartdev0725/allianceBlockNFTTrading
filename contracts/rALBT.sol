// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title AllianceBlock Reputation Token contract
 * @dev Extends Ownable
 */
contract rALBT is Ownable {
    using SafeMath for uint256;

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    string constant NAME = "Reputational AllianceBlock Token"; // The name of the token
    string constant SYMBOL = "rALBT"; // The symbol of the token
    uint256 _totalSupply;

    mapping(address => uint256) private _balances;

    /**
     * @notice Multi Mint To
     * @dev Multimints tokens.
     * @dev Requires valid lists
     * @param to The addresses that will be minted tokens.
     * @param amounts The amounts of tokens to be minted.
     */
    function multiMintTo(address[] memory to, uint256[] memory amounts) external onlyOwner() {
        require(to.length == amounts.length, "Invalid length of to or amounts");

        for (uint256 i = 0; i < to.length; i++) {
            if (to[i] != address(0)) _mint(to[i], amounts[i]);
        }
    }

    /**
     * @notice Mint To
     * @dev Mints amountToMint tokens to the sender
     * @param amountToMint The amount of tokens to be minted
     */
    function mintTo(address to, uint256 amountToMint) external onlyOwner() {
        _mint(to, amountToMint);
    }

    /**
     * @notice Burn From
     * @dev Burns amountToBurn tokens from the sender
     * @param amountToBurn The amount of tokens to be burnt
     */
    function burnFrom(address from, uint256 amountToBurn) external onlyOwner() {
        _burn(from, amountToBurn);
    }

    /**
     * @notice Name
     * @dev Returns the name of the token.
     */
    function name() public pure returns (string memory) {
        return NAME;
    }

    /**
     * @notice Symbol
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public pure returns (string memory) {
        return SYMBOL;
    }

    /**
     * @notice Decimals
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
     * called.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public pure returns (uint8) {
        return 18;
    }

    /**
     * @notice Total Supply
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice Balance Of
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @notice Mint
     * @dev requires not to zero address
     * @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    /**
     * @notice Burn
     * @dev requires not from zero address
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }
}
