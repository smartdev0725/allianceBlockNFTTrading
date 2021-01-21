// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libs/LoanLibrary.sol";
import "./interfaces/IERC1155Mint.sol";
import "./interfaces/IERC721Mint.sol";

/**
 * @title AllianceBlock Registry contract
 * @notice Responsible for loan transactions
 */
contract Registry is Ownable {
    using SafeMath for uint256;

	uint256 public totalLoans;

	mapping(uint256 => LoanLibrary.LoanDetails) public loanDetails;
    mapping(uint256 => LoanLibrary.LoanTypes) public loanTypes;
    mapping(uint256 => LoanLibrary.LoanPayments) public loanPayments;
    mapping(uint256 => LoanLibrary.LoanStatus) public loanStatus;
    mapping(uint256 => address) public loanBorrower;

    address public governanceAddress;
    IERC20 public lendingToken;
    IERC721Mint public mainNFT;
    IERC1155Mint public loanNFT;

    uint256 public baseAmountForEachPartition;
    uint256 public minimumInterestPercentage;

    modifier onlyGovernance() {
        require(msg.sender = governanceAddress, "Only Governance");
        _;
    }

    modifier onlyBorrower(uint256 loanId) {
        require(msg.sender = loanBorrower(loanId), "Only Borrower of the loan");
        _;
    }

    modifier onlyActivelyFundedLoan(uint256 loanId) {
        require(loanDetails[loanId].status == (LoanLibrary.LoanStatus.APPROVED || LoanLibrary.LoanStatus.FUNDING),
            "Only when loan is actively getting funded");
        _;
    }

    modifier onlyActiveLoan(uint256 loanId) {
        require(loanDetails[loanId].status == (LoanLibrary.LoanStatus.STARTED),
            "Only when loan is active");
        _;
    }

    /**
     * @dev Constructor of the contract.
     */
    constructor(
        uint256 baseAmountForEachPartition_,
        address governanceAddress_,
        address lendingToken_,
        uint256 minimumInterestPercentage_,
        address mainNFT_,
        address loanNFT_
    )
    public
    {
        baseAmountForEachPartition = baseAmountForEachPartition_;
        governanceAddress = governanceAddress_;
        lendingToken = IERC20(lendingToken_);
        minimumInterestPercentage = minimumInterestPercentage_;
        mainNFT = IERC721Mint(mainNFT_);
        loanNFT = IERC1155Mint(loanNFT_);
    }

    function requestLoan(
    	uint256 amountRequested,
    	address collateralToken,
    	uint256 collateralAmount,
        uint256 totalAmountOfBatches,
        uint256 interestPercentage,
        uint256 batchTimeInterval,
        bytes32 extraInfo,
    	LoanLibrary.RepaymentBatchType repaymentBatchType,
    	LoanLibrary.AmountProvisionType amountProvisionType
    )
    external
    {
        require(amountRequested.mod(baseAmountForEachPartition) == 0, "Requested Amount must be a multiplier of base amount");
        require(interestPercentage >= minimumInterestPercentage, "Interest percentage lower than limit");

        IERC20(collateralToken).transferFrom(msg.sender, address(this), collateralAmount);

        _storeLoanDetails(
            amountRequested,
            collateralToken,
            collateralAmount,
            totalAmountOfBatches,
            interestPercentage,
            batchTimeInterval,
            extraInfo
        );

        _storeLoanTypes(
            repaymentBatchType,
            amountProvisionType
        );

        _storeLoanPayments();

        loanBorrower[totalLoans] = msg.sender;

        mainNFT.mint(address(this));
        loanNFT.mint(address(this), totalLoans, amountRequested.div(baseAmountForEachPartition), "");

        totalLoans = totalLoans.add(1);
    }

    function decideForLoan(
        uint256 loanId,
        bool decision
    )
    external
    onlyGovernance()
    {
        if(decision) _approveLoan(loanId);
        else _rejectLoan(loanId);
    }

    function fundLoan(
        uint256 loanId,
        uint256 partitionsToPurchase
    )
    external
    onlyActivelyFundedLoan(loanId)
    {
        require(partitionsToPurchase <= loanDetails[loanId].totalPartitions.sub(loanPayments[loanId].partitionsPurchased),
            "Not enough partitions left for purchase");

        if(loanStatus[loanId] == LoanLibrary.LoanStatus.APPROVED) {
            loanStatus[loadId] = LoanLibrary.LoanStatus.FUNDING;
        }

        IERC20(lendingToken).transferFrom(msg.sender, address(this), partitionsToPurchase.mul(baseAmountForEachPartition));
        loanNFT.safeTransferFrom(address(this), msg.sender, loanId, partitionsToPurchase, "");

        loanPayments[loanId].partitionsPurchased = loanPayments[loanId].partitionsPurchased.add(partitionsToPurchase);

        if(loanPayments[loanId].partitionsPurchased == loanDetails[loanId].totalPartitions) {
            _startLoan(loanId);
        }
    }

    function executePayment(
        uint256 loanId
    )
    external
    onlyBorrower(loanId)
    onlyActiveLoan(loanId)
    {
        // TODO: Add repayment from collateral case.
    }

    function challengeLoan(
        uint256 loanId
    )
    external
    onlyActiveLoan(loanId)
    {
        if(loanPayments[loanId].batchDeadlineTimestamp < block.timestamp) {
            loanPayments[loanId].batchesSkipped = loanPayments[loanId].batchesSkipped.add(1);
        }

        // DEFAULT case
        if(loanPayments[loanId].batchesSkipped > 1) {
            loanStatus[loadId] = LoanLibrary.LoanStatus.DEFAULT;

            // TODO: Add flow for default

            // if(loanTypes[loanId].repaymentBatchType == LoanLibrary.RepaymentBatchType.INTEREST_PLUS_NOMINAL) {
            //     
            // }
        } else {
            loanPayments[loanId].batchDeadlineTimestamp =
                loanPayments[loanId].batchDeadlineTimestamp.add(loanDetails[loanId].timeIntervalBetweenBatches);
        }
    }

    function _storeLoanDetails(
        uint256 lendingAmountRequested_,
        address collateralToken_,
        uint256 collateralAmount_,
        uint256 totalAmountOfBatches_,
        uint256 interestPercentage_,
        uint256 batchTimeInterval_,
        bytes32 extraInfo_
    )
    internal
    {
        LoanLibrary.LoanDetails loan;
        loan.loanId = totalLoans;
        loan.collateralToken = collateralToken_;
        loan.collateralAmount = collateralAmount_;
        loan.lendingAmount = lendingAmountRequested_;
        loan.totalAmountOfBatches = totalAmountOfBatches_;
        loan.totalInterest = lendingAmountRequested_.mul(interestPercentage_).div(100);
        loan.timeIntervalBetweenBatches = batchTimeInterval_;
        loan.extraInfo = extraInfo_;

        loanDetails[totalLoans] = loan;
    }

    function _storeLoanTypes(
        LoanLibrary.RepaymentBatchType repaymentBatchType_,
        LoanLibrary.AmountProvisionType amountProvisionType_
    )
    internal
    {
        LoanLibrary.LoanTypes loanType;
        loanType.repaymentBatchType = repaymentBatchType_;
        loanType.amountProvisionType = amountProvisionType_;

        loanTypes[totalLoans] = loanType;
        loanStatus[totalLoans] = LoanLibrary.LoanStatus.REQUESTED;
    }    

    function _storeLoanPayments()
    internal
    {
        // Calculate repayment of borrower for each batch.
        if(loanTypes[totalLoans].repaymentBatchType == LoanLibrary.RepaymentBatchType.ONLY_INTEREST) {
            loanPayments[totalLoans].amountEachBatch = loanDetails[totalLoans].totalInterest.div(
                loanDetails[totalLoans].totalAmountOfBatches);
        } else {
            loanPayments[totalLoans].amountEachBatch = loanDetails[totalLoans].totalInterest.add(
                loanDetails[totalLoans].lendingAmount).div(
                loanDetails[totalLoans].totalAmountOfBatches);
        }

        // Calculate amount provided to borrower for each batch.
        if(loanTypes[totalLoans].amountProvisionType == LoanLibrary.AmountProvisionType.BATCH_PROVIDED) {
            loanPayments[totalLoans].lendingAmountEachBatch = loanDetails[totalLoans].lendingAmount.div(
                loanDetails[totalLoans].totalAmountOfBatches);
        }
    }

    function _approveLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loanId_] = LoanLibrary.LoanStatus.APPROVED;
    }

    function _rejectLoan(
        uint256 loanId_
    )
    internal
    {
        loanDetails[loanId_].status = LoanLibrary.LoanStatus.REJECTED;
        IERC20(loanDetails[loanId_].collateralToken).transfer(loanBorrower[loanId_], loanDetails[loanId_].collateralAmount);
    }

    function _startLoan(
        uint256 loanId_
    )
    internal
    {
        loanStatus[loadId] = LoanLibrary.LoanStatus.STARTED;
        loanPayments[loanId_].startingDate = block.timestamp;
        loanPayments[loanId_].batchStartingTimestamp = block.timestamp;
        loanPayments[loanId_].batchDeadlineTimestamp = block.timestamp.add(loanDetails[totalLoans].timeIntervalBetweenBatches);

        if(loanTypes[loanId_].amountProvisionType == LoanLibrary.LoanStatus.WHOLY_PROVIDED) {
            lendingToken.transfer(loanBorrower[loanId_], loanDetails[loanId_].lendingAmount);
        } else {
            lendingToken.transfer(loanBorrower[loanId_], loanPayments[loanId_].lendingAmountEachBatch);
        }
    }
}
