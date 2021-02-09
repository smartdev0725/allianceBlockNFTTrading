// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LoanLibrary.sol";
import "./interfaces/IRegistry.sol";

/**
 * @title AllianceBlock EscrowDetails contract
 * @notice Functionality, storage and modifiers for escrow
 */
contract EscrowDetails {

    IRegistry public registry;
    
    mapping(uint256 => address) public loanBorrower;

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "Only Registry");
        _;
    }

    modifier onlyBorrower(uint256 loanId) {
        require(msg.sender == loanBorrower[loanId], "Only Borrower of the loan");
        _;
    }
}
