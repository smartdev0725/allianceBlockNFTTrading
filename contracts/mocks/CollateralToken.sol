// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

/**
 * @title Mock contract for ALBT ERC20 Token
 * @dev Extends ERC20PresetMinterPauser
 */
contract CollateralToken is ERC20PresetMinterPauser {
    constructor() ERC20PresetMinterPauser("Collateral Token", "CLT") {}
}
