// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LoanLibrary.sol";
import "./EscrowDetails.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Holder.sol";
import "./rALBT.sol";

/**
 * @title AllianceBlock Escrow contract
 * @notice Responsible for handling the funds in AllianceBlock's ecosystem.
 */
contract Escrow is EscrowDetails, Ownable, ERC1155Holder {
    /**
     * @dev Constructor of the contract.
     * @param lendingToken_ The token that lenders will be able to lend.
     * @param mainNFT_ The ERC721 token contract which will represent the whole loans.
     * @param fundingNFT_ The ERC1155 token contract which will represent the lending amounts.
     */
    constructor(
        address lendingToken_,
        address mainNFT_,
        address fundingNFT_
    ) public {
        lendingToken = IERC20(lendingToken_);
        mainNFT = IERC721Mint(mainNFT_);
        fundingNFT = IERC1155Mint(fundingNFT_);

        reputationalALBT = new rALBT();
    }

    /**
     * @dev Initializes the contract.
     * @param registryAddress_ The registry address.
     */
    function initialize(address registryAddress_) external onlyOwner() {
        require(
            address(registry) == address(0),
            "Cannot initialize second time"
        );
        registry = IRegistry(registryAddress_);
    }

    /**
     * @dev This function is used to send the ERC1155 tokens from escrow to the lenders.
     * @param loanId The id of the loan.
     * @param partitionsPurchased The amount of ERC1155 tokens that should be sent back to the lender.
     * @param receiver Lender's address.
     */
    function transferFundingNFT(
        uint256 loanId,
        uint256 partitionsPurchased,
        address receiver
    ) external onlyRegistry() {
        fundingNFT.safeTransferFrom(
            address(this),
            receiver,
            loanId,
            partitionsPurchased,
            ""
        );
    }

    /**
     * @dev This function is used to send the lended amount to the seeker.
     * @param seeker Seeker's address.
     * @param amount The amount of lending tokens to be sent to seeker.
     */
    function transferLendingToken(address seeker, uint256 amount)
        external
        onlyRegistry()
    {
        lendingToken.transfer(seeker, amount);
    }

    /**
     * @dev This function is used to send the collateral amount to the seeker.
     * @param collateralToken The collateral token's contract address.
     * @param recipient The address to transfer the collateral tokens to.
     * @param amount The amount of collateral tokens to be sent to seeker.
     */
    function transferCollateralToken(
        address collateralToken,
        address recipient,
        uint256 amount
    ) external onlyRegistry() {
        IERC20(collateralToken).transfer(recipient, amount);
    }

    /**
     * @dev This function is used to mint reputational tokens.
     * @param recipient The address to mint the reputational tokens to.
     * @param amount The amount of reputational tokens to be minted.
     */
    function mintReputationalToken(
        address recipient,
        uint256 amount
    ) external onlyRegistry() {
        reputationalALBT.mintTo(recipient, amount);
    }

    /**
     * @dev This function is used to burn reputational tokens.
     * @param from The address to burn the reputational tokens from.
     * @param amount The amount of reputational tokens to be burnt.
     */
    function burnReputationalToken(
        address from,
        uint256 amount
    ) external onlyRegistry() {
        reputationalALBT.burnFrom(from, amount);
    }

    /**
     * @dev This function is used to change the registry address in case of an upgrade.
     * @param registryAddress The address of the upgraded Registry contract.
     */
    function changeRegistry(address registryAddress) external onlyOwner() {
        registry = IRegistry(registryAddress);
    }
}
