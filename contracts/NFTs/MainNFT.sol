// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
/**
 * @title Alliance Block Main NFT
 * @notice NFT custodied Asset
 * @dev Extends Initializable, ERC721Upgradeable
 */
contract MainNFT is Initializable, ERC721Upgradeable  {

    /**
     * @dev Initializes the contract by setting the name, symbol, and base URI
     */
    function initialize(string memory name, string memory symbol) public initializer {
        __ERC721_init(name, symbol);
        _setBaseURI("");
    }

}