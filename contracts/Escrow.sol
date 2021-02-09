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
     * @dev Initializes the contract by setting the registry address, lending token address, main NFT address and the loan NFT address
     */
    constructor(
        address registryAddress_,
        address lendingToken_,
        address mainNFT_,
        address loanNFT_
    ) 
    public 
    {
        registry = IRegistry(registryAddress_);
        lendingToken = IERC20(lendingToken_);
        mainNFT = IERC721Mint(mainNFT_);
        loanNFT = IERC1155Mint(loanNFT_);
    }

    function transferLoanNFT(
        uint256 loanId,
        uint256 partitionsToPurchase
    )
    external
    onlyRegistry()
    {
        loanNFT.safeTransferFrom(address(this), msg.sender, loanId, partitionsToPurchase, "");
    }

    function transferLendingToken(
        address borrower,
        uint256 amount
    )
    external
    onlyRegistry()
    {
        lendingToken.transfer(borrower, amount);
    }

    function transferCollateralToken(
        address collateralToken,
        address borrower,
        uint256 amount
    )
    external
    onlyRegistry()
    {
        IERC20(collateralToken).transfer(borrower, amount);
    }

    function changeRegistry(
        address registryAddress_
    )
    external
    onlyOwner()
    {
        registry = IRegistry(registryAddress_);
    }

    // function receiveFunding(
    // 	uint256 loanId,
    //     uint256 amount
    // )
    // external
    // onlyRegistry()
    // {

    // }

    // function claimFunding(
    //     uint256 loanId
    // )
    // external
    // onlyBorrower(loanId)
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
