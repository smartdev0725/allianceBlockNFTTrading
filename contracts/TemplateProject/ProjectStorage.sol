// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libs/ProjectLibrary.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC1155Mint.sol";
import "../interfaces/IGovernance.sol";
import "../interfaces/IEscrow.sol";

/**
 * @title AllianceBlock Storage contract
 * @notice Responsible for investment storage
 */
contract ProjectStorage {

    IGovernance public governance; // Governance's contract address.
    IERC1155Mint public fundingNFT; // Funding nft's contract address.
    IEscrow public escrow; // Escrow's contract address.
    IERC20 public rALBT; // rALBT's contract address.

    uint256 public totalProjects; // The total amount of investment requests.

    // Mapping from project id -> project seeker's address.
    mapping(uint256 => address) public projectSeeker;

    // // Mapping from investment id -> details for each and every investment.
    // mapping(uint256 => ProjectLibrary.InvestmentDetails) public investmentDetails;
    // // Mapping from investment id -> investment status.
    // mapping(uint256 => ProjectLibrary.projectStatus) public projectStatus;

    // All supported lending tokens are giving true, while unsupported are giving false.
    mapping(address => bool) public isValidLendingToken;

    // Mapping from investment id -> details for each and every investment.
    mapping(uint256 => ProjectLibrary.InvestmentDetails) public investmentDetails;
    // Mapping from investment id -> investment status.
    mapping(uint256 => ProjectLibrary.ProjectStatus) public projectStatus;

}