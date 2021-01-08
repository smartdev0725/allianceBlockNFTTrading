// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol";
 
contract LoanNFT is ERC1155PresetMinterPauser {
    constructor() public ERC1155PresetMinterPauser("https://ipfs.io/ipfs/"){}
}