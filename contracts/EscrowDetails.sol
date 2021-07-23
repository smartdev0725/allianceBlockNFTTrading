// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC1155Mint.sol";
import "./interfaces/IERC721Mint.sol";
import "./interfaces/IInvestment.sol";
import "./rALBT.sol";

/**
 * @title AllianceBlock EscrowDetails contract
 * @notice Functionality, storage and modifiers for Escrow
 */
contract EscrowDetails {
    IInvestment public investment;

    IERC20 public lendingToken;
    IERC1155Mint public fundingNFT;
    address public actionVerifier;
    address public staking;

    mapping(uint256 => address) public investmentSeeker;
    rALBT public reputationalALBT;

    modifier onlyInvestment() {
        require(msg.sender == address(investment), "Only Investment");
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

    modifier onlyInvestmentOrStaking() {
        require(msg.sender == staking || msg.sender == address(investment), "Only Investment or Staking");
        _;
    }
}
