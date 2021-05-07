// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libs/LoanLibrary.sol";
import "../interfaces/IERC1155Mint.sol";
import "../interfaces/IERC721Mint.sol";
import "../interfaces/IGovernance.sol";
import "../interfaces/IEscrow.sol";

/**
 * @title AllianceBlock Storage contract
 * @notice Responsible for loan storage
 */
contract Storage {
    uint256 public totalLoans; // The total amount of loan requests.

    // Mapping from loan id -> details for each and every loan.
    mapping(uint256 => LoanLibrary.LoanDetails) public loanDetails;
    // Mapping from loan id -> details for personal loans.
    mapping(uint256 => LoanLibrary.PersonalLoanPayments) public personalLoanPayments;
    // Mapping from loan id -> details for project loans.
    mapping(uint256 => LoanLibrary.ProjectLoanPayments) public projectLoanPayments;
    // Mapping from loan id -> loan status.
    mapping(uint256 => LoanLibrary.LoanStatus) public loanStatus;
    // Mapping from loan id -> loan seeker's address.
    mapping(uint256 => address) public loanSeeker;

    IGovernance public governance; // Governance's contract address.
    IERC20 public lendingToken; // Lending token's contract address.
    IERC721Mint public mainNFT; // Main nft's contract address.
    IERC1155Mint public fundingNFT; // Funding nft's contract address.
    IEscrow public escrow; // Escrow's contract address.

    // This variable represents the base amount in which every loan amount is divided to. (also the starting value for each ERC1155)
    uint256 public baseAmountForEachPartition;
    // This variable represents the minimum interest percentage that each loan should have.
    uint256 public minimumInterestPercentage;
    // This variable represents the maximum number of milestones a project loan can contain.
    uint256 public maxMilestones;
    // If milestone is rejected, this time interval is provided for the project to deliver.
    uint256 public milestoneExtensionInterval;
    // The amount of vesting batches when a lender decides to get project tokens.
    uint256 public vestingBatches;
    // The time interval between vesting batches when a lender decides to get project tokens.
    uint256 public vestingTimeInterval;
    // The time interval for adding funds
    uint256 public fundingTimeInterval;
}
