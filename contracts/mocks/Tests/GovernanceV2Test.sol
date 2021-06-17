// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "../../Governance.sol";

/**
 * @title AllianceBlock Governance contract
 * @dev WARNING Only for testing purposes, we added a couple of new methods and storage variables to check contract upgrade works fine
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract GovernanceV2Test is Governance {
    uint256 public foo;
    uint256 public bar;

    function getSomething1() public view returns (uint256) {
        return 1;
    }

    function getSomething2() public view returns (uint256) {
        return 2;
    }
}
