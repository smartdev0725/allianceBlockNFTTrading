// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

/**
 * @title Mock contract for ALBT ERC20 Token
 */
contract ALBT is ERC20PresetMinterPauser {
    constructor() public ERC20PresetMinterPauser("AllianceBlock Token", "ALBT"){}
}
