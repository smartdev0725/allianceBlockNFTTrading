// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title Alliance Block Main NFT
 * @notice NFT custodied Asset
 */
contract MainNFT is ERC721 {

    /**
     * @dev Initializes the contract by setting the name, symbol, and base URI
     */
    constructor() public ERC721("Alliance Block Custody NFT", "bNFT"){
        _setBaseURI("");
    }
}