// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";

/**
 * @title Main Alliance Block Protocol
 */
contract Protocol {
    uint256 private value;
 
    // Stores a new value in the contract
    function store(uint256 newValue) public {
        value = newValue;
        console.log("(HH) New Value:", newValue);
    }
 
    // Reads the last stored value
    function retrieve() public view returns (uint256) {
        return value;
    }
}