// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC1155Mint.sol";
import "./interfaces/IERC721Mint.sol";
import "./interfaces/IRegistry.sol";
import "./rALBT.sol";

/**
 * @title AllianceBlock EscrowDetails contract
 * @notice Functionality, storage and modifiers for Escrow
 */
contract EscrowDetails {
    IRegistry public registry;

    IERC20 public lendingToken;
    IERC1155Mint public fundingNFT;
    address public actionVerifier;
    address public staking;

    mapping(uint256 => address) public investmentSeeker;
    rALBT public reputationalALBT;

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "Only Registry");
        _;
    }

    modifier onlyActionVerifier() {
        require(msg.sender == actionVerifier, "Only Action Verifier");
        _;
    }

    modifier onlyStaking() {
        require(msg.sender == staking, "Only Staking");
        _;
    }

    modifier onlyRegistryOrStaking() {
        require(msg.sender == staking || msg.sender == address(registry), "Only Registry or Staking");
        _;
    }
}
