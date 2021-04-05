// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LoanLibrary.sol";
import "./EscrowDetails.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Holder.sol";

/**
 * @title AllianceBlock Escrow contract
 * @notice Responsible for handling the funds in AllianceBlock's ecosystem.
 */
contract Escrow is EscrowDetails, Ownable, ERC1155Holder {

    /**
     * @dev Constructor of the contract.
     * @param lendingToken_ The token that lenders will be able to lend.
     * @param mainNFT_ The ERC721 token contract which will represent the whole loans.
     * @param loanNFT_ The ERC1155 token contract which will represent the lending amounts.
     */
    constructor(
        address lendingToken_,
        address mainNFT_,
        address loanNFT_
    ) 
    public 
    {
        lendingToken = IERC20(lendingToken_);
        mainNFT = IERC721Mint(mainNFT_);
        loanNFT = IERC1155Mint(loanNFT_);
    }

    /**
     * @dev Initializes the contract.
     * @param registryAddress_ The registry address.
     */
    function initialize(
        address registryAddress_
    )
    external
    onlyOwner()
    {
        require(address(registry) == address(0), "Cannot initialize second time");
        registry = IRegistry(registryAddress_);
    }

    /**
     * @dev This function is used to send the ERC1155 tokens from escrow to the lenders.
     * @param loanId The id of the loan.
     * @param partitionsPurchased The amount of ERC1155 tokens that should be sent back to the lender.
     * @param receiver Lender's address.
     */
    function transferLoanNFT(
        uint256 loanId,
        uint256 partitionsPurchased,
        address receiver
    )
    external
    onlyRegistry()
    {
        loanNFT.safeTransferFrom(address(this), receiver, loanId, partitionsPurchased, "");
    }

    /**
     * @dev This function is used to send the lended amount to the borrower.
     * @param borrower Borrower's address.
     * @param amount The amount of lending tokens to be sent to borrower.
     */
    function transferLendingToken(
        address borrower,
        uint256 amount
    )
    external
    onlyRegistry()
    {
        lendingToken.transfer(borrower, amount);
    }

    /**
     * @dev This function is used to send the collateral amount to the borrower.
     * @param collateralToken The collateral token's contract address.
     * @param borrower Borrower's address.
     * @param amount The amount of collateral tokens to be sent to borrower.
     */
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

    /**
     * @dev This function is used to change the registry address in case of an upgrade.
     * @param registryAddress The address of the upgraded Registry contract.
     */
    function changeRegistry(
        address registryAddress
    )
    external
    onlyOwner()
    {
        registry = IRegistry(registryAddress);
    }
}
