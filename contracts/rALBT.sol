// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract rALBT is ERC20, Ownable {
	using SafeMath for uint256;

	string constant NAME = "Reputational AllianceBlock Token"; // The name of the token
	string constant SYMBOL = "rALBT"; // The symbol of the token

    constructor() ERC20(NAME, SYMBOL) {}

    /**
     * @dev Mints amountToMint tokens to the sender
     * @param amountToMint The amount of tokens to be minted
     */
    function mintTo(address to, uint256 amountToMint) external onlyOwner() {
    	_mint(to, amountToMint);
    }

    /**
     * @dev Burns amountToBurn tokens from the sender
     * @param amountToBurn The amount of tokens to be burnt
     */
    function burnFrom(address from, uint256 amountToBurn) external onlyOwner() {
    	_burn(from, amountToBurn);
    }
}
