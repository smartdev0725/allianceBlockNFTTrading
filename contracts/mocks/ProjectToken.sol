// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

/**
 * @title Mock contract for ALBT ERC20 Token
 * @dev Extends ERC20PresetMinterPauser
 */
contract InvestmentToken is ERC20PresetMinterPauser {
    constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {}
}
