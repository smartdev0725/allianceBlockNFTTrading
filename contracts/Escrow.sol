// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155HolderUpgradeable.sol";
import "./libs/LoanLibrary.sol";
import "./EscrowDetails.sol";
import "./rALBT.sol";

/**
 * @title AllianceBlock Escrow contract
 * @notice Responsible for handling the funds in AllianceBlock's ecosystem.
 * @dev Extends Initializable, EscrowDetails, OwnableUpgradeable, ERC1155HolderUpgradeable
 */
contract Escrow is Initializable, EscrowDetails, OwnableUpgradeable, ERC1155HolderUpgradeable {
    /**
     * @notice Initialize
     * @dev Initializes the contract.
     * @param lendingToken_ The token that lenders will be able to lend.
     * @param fundingNFT_ The ERC1155 token contract which will represent the lending amounts.
     */
    function initialize(
        address lendingToken_,
        address fundingNFT_
    ) public initializer {
        __Ownable_init();
        lendingToken = IERC20(lendingToken_);
        fundingNFT = IERC1155Mint(fundingNFT_);
        reputationalALBT = new rALBT();
    }

    /**
     * @notice After Initialize
     * @dev To be executed after Initialize
     * @dev requires not already initialized
     * @param registryAddress_ The registry address.
     * @param actionVerifierAddress_ The actionVerifier address.
     * @param stakingAddress_ The staking address
     */
    function afterInitialize(
        address registryAddress_,
        address actionVerifierAddress_,
        address stakingAddress_
    ) external onlyOwner() {
        require(address(registry) == address(0), "Cannot initialize registry second time");
        require(address(actionVerifier) == address(0), "Cannot initialize actionVerifier second time");
        require(address(staking) == address(0), "Cannot initialize staking second time");
        registry = IRegistry(registryAddress_);
        actionVerifier = actionVerifierAddress_;
        staking = stakingAddress_;
    }

    /**
     * @notice Transfer Funding NFT
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
        fundingNFT.safeTransferFrom(address(this), receiver, loanId, partitionsPurchased, "");
    }

    /**
     * @notice Transfer Lending Token
     * @dev This function is used to send the lended amount to the seeker.
     * @param seeker Seeker's address.
     * @param amount The amount of lending tokens to be sent to seeker.
     */
    function transferLendingToken(address seeker, uint256 amount) external onlyRegistry() {
        lendingToken.transfer(seeker, amount);
    }

    /**
     * @notice Transfer Collateral Token
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
     * @notice Multi Mint Reputation Token
     * @dev This function is used to multi mint reputational tokens.
     * @param recipients The addresses to mint the reputational tokens to.
     * @param amounts The amounts of reputational tokens to be minted.
     */
    function multiMintReputationalToken(
        address[] memory recipients,
        uint256[] memory amounts
    ) external onlyActionVerifier() {
        reputationalALBT.multiMintTo(recipients, amounts);
    }

    /**
     * @notice Mint Reputation Token
     * @dev This function is used to mint reputational tokens.
     * @param recipient The address to mint the reputational tokens to.
     * @param amount The amount of reputational tokens to be minted.
     */
    function mintReputationalToken(
        address recipient,
        uint256 amount
    ) external onlyRegistryOrStaking() {
        reputationalALBT.mintTo(recipient, amount);
    }

    /**
     * @notice Burn Reputation token
     * @dev This function is used to burn reputational tokens.
     * @param from The address to burn the reputational tokens from.
     * @param amount The amount of reputational tokens to be burnt.
     */
    function burnReputationalToken(
        address from,
        uint256 amount
    ) external onlyStaking() {
        reputationalALBT.burnFrom(from, amount);
    }

    /**
     * @notice Change Registry
     * @dev This function is used to change the registry address in case of an upgrade.
     * @param registryAddress The address of the upgraded Registry contract.
     */
    function changeRegistry(address registryAddress) external onlyOwner() {
        registry = IRegistry(registryAddress);
    }
}
