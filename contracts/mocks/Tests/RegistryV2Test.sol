// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "../../Registry.sol";

/**
 * @title AllianceBlock Registry contract
 * @notice Responsible for loan transactions.
 */
contract RegistryV2Test is Registry {
    // Only for test upgrade
    uint256 public foo;
    uint256 public bar;

    /**
    * @dev Only for testing purposes
    */
    function getSomething1() public view returns (uint256) {
        return 1;
    }

    /**
    * @dev Only for testing purposes
    */
    function getSomething2() public view returns (uint256) {
        return 2;
    }
}
