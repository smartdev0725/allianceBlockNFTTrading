// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LoanLibrary.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract Governance is Ownable {
	uint256 public amountOfLoans;
	mapping(uint256 => LoanLibrary.Loan) public loanDetails;
    uint256 public baseAmountForEachPartition;

    /**
     * @dev Initializes the contract by setting basic 
     */
    constructor() public {
        _setBaseURI("");
    }

    function requestLoan(
    	uint256 tokenRequested,
    	uint256 amountRequested,
    	address collateralToken,
    	uint256 collateralAmount,
    	uint256 repaymentBatchType,
    	uint256 loanRepaymentAssetType,
    	uint256 loanAmountProvisionType
    )
    external
    {

    }

    function approveLoan(
        uint256 loanId
    )
    external
    onlyGovernance()
    {

    }

    function fundLoan(
        uint256 loanId,
        uint256 partitionsToPurchase
    )
    external
    {

    }

    function executePayment(
        uint256 loanId
    )
    external
    onlyBorrower(loanId)
    {

    }
}
