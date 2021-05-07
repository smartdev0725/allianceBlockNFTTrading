// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC1155Mint.sol";
import "./interfaces/IERC721Mint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LoanLibrary.sol";
import "./interfaces/IRegistry.sol";

/**
 * @title AllianceBlock EscrowDetails contract
 * @notice Functionality, storage and modifiers for escrow
 */
contract EscrowDetails {

    IRegistry public registry;
    
    IERC20 public lendingToken;
    IERC721Mint public mainNFT;
    IERC1155Mint public fundingNFT;

    mapping(uint256 => address) public loanSeeker;

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "Only Registry");
        _;
    }
}
