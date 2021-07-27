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

    uint256 projectCont;
    // mapping to save the address to a project
    mapping(uint256 => address) public projects;
    // mapping to save the index of the type of project
    mapping(address => uint256) public projectTypesIndex;

    IInvestment public investment;

    IERC20 public lendingToken;
    IERC1155Mint public fundingNFT;
    address public actionVerifier;
    address public staking;

    mapping(uint256 => address) public investmentSeeker;
    rALBT public reputationalALBT;

    modifier onlyProject() {
        require(projectTypesIndex[msg.sender] != 0, "Only Project");
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
        require(msg.sender == staking || projectTypesIndex[msg.sender] != 0, "Only Project or Staking");
        _;
    }
}
