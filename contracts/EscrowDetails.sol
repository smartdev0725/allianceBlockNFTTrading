// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC1155Mint.sol";
import "./interfaces/IERC721Mint.sol";
import "./interfaces/IProjectManager.sol";
import "./rALBT.sol";

/**
 * @title AllianceBlock EscrowDetails contract
 * @notice Functionality, storage and modifiers for Escrow
 */
contract EscrowDetails {

    IProjectManager public projectManager;
    IERC20 public lendingToken;
    IERC1155Mint public fundingNFT;
    address public actionVerifier;
    address public staking;

    rALBT public reputationalALBT;

    modifier onlyProject() {
        require(projectManager.isProject(msg.sender), "Only Project");
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

    modifier onlyProjectOrStaking() {
        require(msg.sender == staking || projectManager.isProject(msg.sender), "Only Project or Staking");
        _;
    }
}
