// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "./registry/Investment.sol";
import "./libs/TokenFormat.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title AllianceBlock Registry contract
 * @notice Responsible for investment transactions.
 * @dev Extends Initializable, Investment, OwnableUpgradeable
 */
contract Registry is Initializable, Investment, OwnableUpgradeable {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // Events
    event InvestmentStarted(uint256 indexed investmentId);
    event InvestmentApproved(uint256 indexed investmentId);
    event InvestmentRejected(uint256 indexed investmentId);

    /**
     * @notice Initialize
     * @dev Constructor of the contract.
     * @param escrowAddress address of the escrow contract
     * @param governanceAddress_ address of the DAO contract
     * @param lendingTokens_ addresses of the Lending Tokens
     * @param fundingNFT_ address of the Funding NFT
     * @param baseAmountForEachPartition_ The base amount for each partition
     */
    function initialize(
        address escrowAddress,
        address governanceAddress_,
        address[] memory lendingTokens_,
        address fundingNFT_,
        uint256 baseAmountForEachPartition_
    ) external initializer {
        require(escrowAddress != address(0), "Cannot initialize escrowAddress with 0 address");
        require(governanceAddress_ != address(0), "Cannot initialize governanceAddress_ with 0 address");
        require(fundingNFT_ != address(0), "Cannot initialize fundingNFT_ with 0 address");
        require(baseAmountForEachPartition_ != 0, "Cannot initialize baseAmountForEachPartition_ with 0");

        __Ownable_init();
        __Investment_init();

        escrow = IEscrow(escrowAddress);
        baseAmountForEachPartition = baseAmountForEachPartition_;
        governance = IGovernance(governanceAddress_);
        fundingNFT = IERC1155Mint(fundingNFT_);

        for (uint256 i = 0; i < lendingTokens_.length; i++) {
            require(lendingTokens_[i] != address(0), "Cannot initialize lendingToken_ with 0 address");
            isValidLendingToken[lendingTokens_[i]] = true;
        }
    }

    /**
     * @notice Initialize Investment
     * @dev This function is called by the owner to initialize the investment type.
     * @param reputationalAlbt The address of the rALBT contract.
     * @param totalTicketsPerRun_ The amount of tickets that will be provided from each run of the lottery.
     * @param rAlbtPerLotteryNumber_ The amount of rALBT needed to allocate one lucky number.
     * @param blocksLockedForReputation_ The amount of blocks needed for a ticket to be locked,
     *        so as investor to get 1 rALBT for locking it.
     */
    function initializeInvestment(
        address reputationalAlbt,
        uint256 totalTicketsPerRun_,
        uint256 rAlbtPerLotteryNumber_,
        uint256 blocksLockedForReputation_,
        uint256 lotteryNumbersForImmediateTicket_
    ) external onlyOwner() {
        require(reputationalAlbt != address(0), "Cannot initialize with 0 addresses");
        require(totalTicketsPerRun_ != 0 && rAlbtPerLotteryNumber_ != 0 && blocksLockedForReputation_ != 0 && lotteryNumbersForImmediateTicket_ != 0, "Cannot initialize with 0 values");
        require(address(rALBT) == address(0), "Cannot initialize second time");

        rALBT = IERC20(reputationalAlbt);
        totalTicketsPerRun = totalTicketsPerRun_;
        rAlbtPerLotteryNumber = rAlbtPerLotteryNumber_;
        blocksLockedForReputation = blocksLockedForReputation_;
        lotteryNumbersForImmediateTicket = lotteryNumbersForImmediateTicket_;
    }

    /**
     * @notice Add lending token
     * @dev This function is called by the owner to add another lending token.
     * @param lendingToken_ The address of lending token that will be added.
     */
    function addLendingToken(
        address lendingToken_
    ) external onlyOwner() {
        require(lendingToken_ != address(0), "Cannot provide lendingToken_ with 0 address");
        require(!isValidLendingToken[lendingToken_], "Cannot add existing lending token");
        isValidLendingToken[lendingToken_] = true;
    }

    /**
     * @notice Decide For Investment
     * @dev This function is called by governance to approve or reject a investment request.
     * @param investmentId The id of the investment.
     * @param decision The decision of the governance. [true -> approved] [false -> rejected]
     */
    function decideForInvestment(uint256 investmentId, bool decision) external onlyGovernance() {
        if (decision) _approveInvestment(investmentId);
        else _rejectInvestment(investmentId);
    }

    /**
     * @notice Start Lottery Phase
     * @dev This function is called by governance to start the lottery phase for an investment.
     * @param investmentId The id of the investment.
     */
    function startLotteryPhase(uint256 investmentId) external onlyGovernance() {
        _startInvestment(investmentId);
    }

    /**
     * @notice Approve Investment
     * @param investmentId_ The id of the investment.
     */
    function _approveInvestment(uint256 investmentId_) internal {
        investmentStatus[investmentId_] = InvestmentLibrary.InvestmentStatus.APPROVED;
        investmentDetails[investmentId_].approvalDate = block.timestamp;
        ticketsRemaining[investmentId_] = investmentDetails[investmentId_].totalPartitionsToBePurchased;
        governance.storeInvestmentTriggering(investmentId_);
        emit InvestmentApproved(investmentId_);
    }

    /**
     * @notice Reject Investment
     * @param investmentId_ The id of the investment.
     */
    function _rejectInvestment(uint256 investmentId_) internal {
        investmentStatus[investmentId_] = InvestmentLibrary.InvestmentStatus.REJECTED;
        escrow.transferInvestmentToken(
            investmentDetails[investmentId_].investmentToken,
            investmentSeeker[investmentId_],
            investmentDetails[investmentId_].investmentTokensAmount
        );
        emit InvestmentRejected(investmentId_);
    }

    /**
     * @notice Start Investment
     * @param investmentId_ The id of the investment.
     */
    function _startInvestment(uint256 investmentId_) internal {
        investmentStatus[investmentId_] = InvestmentLibrary.InvestmentStatus.STARTED;
        investmentDetails[investmentId_].startingDate = block.timestamp;

        emit InvestmentStarted(investmentId_);
    }

    /**
     * @notice Get Investment Metadata
     * @dev This helper function provides a single point for querying the Investment metadata
     * @param investmentId The id of the investment.
     * @dev returns Investment Details, Investment Status, Investment Seeker Address and Repayment Batch Type
     */
    function getInvestmentMetadata(uint256 investmentId)
        public
        view
        returns (
            InvestmentLibrary.InvestmentDetails memory, // the investmentDetails
            InvestmentLibrary.InvestmentStatus, // the investmentStatus
            address // the investmentSeeker
        )
    {
        return (
            investmentDetails[investmentId],
            investmentStatus[investmentId],
            investmentSeeker[investmentId]
        );
    }

    /**
     * @notice IsValidReferralId
     * @param investmentId The id of the investment.
     * @dev returns true if investment id exists (so also seeker exists), otherwise returns false
     */
    function isValidReferralId(uint256 investmentId) external view returns (bool) {
        return investmentSeeker[investmentId] != address(0);
    }
}
