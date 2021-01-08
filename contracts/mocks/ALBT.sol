// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";
 
contract ALBT is ERC20PresetMinterPauser {
    constructor() public ERC20PresetMinterPauser("AllianceBlock Token", "ALBT"){}
}