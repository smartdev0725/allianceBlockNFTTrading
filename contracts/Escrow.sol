// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LoanLibrary.sol";
import "./EscrowDetails.sol";

/**
 * @title AllianceBlock Escrow contract
 * @notice Responsible for handling the funds in AllianceBlock's ecosystem.
 */
contract Escrow is EscrowDetails, Ownable {

    /**
     * @dev Initializes the contract by setting the name, symbol, and base URI
     */
    constructor(
        address registryAddress_
    ) 
    public 
    {
        registry = IRegistry(registryAddress_);
    }

    function receiveFunding(
    	uint256 loanId,
        uint256 amount
    )
    external
    onlyRegistry()
    {

    }

    // function claimFunding(
    //     uint256 loanId
    // )
    // external
    // onlyBorrower(msg.sender)
    // {

    // }

    // function receivePayment(
    //     uint256 loanId
    // )
    // external
    // onlyRegistry()
    // {

    // }

    // function withdrawPayment(
    //     uint256 loanId
    // )
    // external
    // onlyERC1155Holder(msg.sender)
    // {

    // }
}
