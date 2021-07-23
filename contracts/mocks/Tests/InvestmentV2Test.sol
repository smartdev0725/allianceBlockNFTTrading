// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../../investment/Investment.sol";

/**
 * @title AllianceBlock Investment contract
 * @dev WARNING Only for testing purposes, we added a couple of new methods and storage variables to check contract upgrade works fine
 * @notice Responsible for governing AllianceBlock's ecosystem
 */
contract InvestmentV2Test is Investment {
    uint256 public foo;
    uint256 public bar;

    function getSomething1() public view returns (uint256) {
        return 1;
    }

    function getSomething2() public view returns (uint256) {
        return 2;
    }
}
