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
    uint256 public totalLoans;

    mapping(uint256 => LoanLibrary.LoanDetails) public loanDetails;
    mapping(uint256 => LoanLibrary.PersonalLoanPayments) public personalLoanPayments;
    mapping(uint256 => LoanLibrary.ProjectLoanPayments) public projectLoanPayments;
    mapping(uint256 => LoanLibrary.LoanStatus) public loanStatus;
    mapping(uint256 => address) public loanBorrower;

    IGovernance public governance;
    IERC20 public lendingToken;
    IERC721Mint public mainNFT;
    IERC1155Mint public loanNFT;
    IEscrow public escrow;

    uint256 public baseAmountForEachPartition;
    uint256 public minimumInterestPercentage;
    uint256 public maxMilestones;
    uint256 public milestoneExtensionInterval; // If milestone is rejected, this time interval is provided for the project to deliver.
    uint256 public vestingBatches; // The amount of vesting batches when a lender decides to get project tokens.
    uint256 public vestingTimeInterval; // The time interval between vesting batches when a lender decides to get project tokens.
}
