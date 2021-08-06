// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "./InvestmentDetails.sol";
import "../../libs/SafeERC20.sol";
import "../../libs/TokenFormat.sol";

/**
 * @title AllianceBlock Investment contract.
 * @notice Functionality for Investment.
 * @dev Extends InvestmentDetails.
 */
contract Investment is Initializable, InvestmentDetails, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using TokenFormat for uint256;
    using SafeERC20 for IERC20;

    // EVENTS
    event LotteryExecuted(uint256 indexed projectId);
    event WithdrawProjectTickets(uint256 indexed projectId, uint256 ticketsToLock, uint256 ticketsToWithdraw);
    event seekerWithdrawInvestment(uint256 indexed projectId, uint256 amountWithdrawn);
    event WithdrawAmountForNonTickets(uint256 indexed projectId, uint256 amountToReturnForNonWonTickets);
    event WithdrawLockedProjectTickets(uint256 indexed projectId, uint256 ticketsToWithdraw);
    event ConvertNFTToProjectTokens(uint256 indexed projectId, uint256 amountOfNFTToConvert, uint256 amountOfInvestmentTokenToTransfer);

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
        address projectManager_,
        uint256 baseAmountForEachPartition_
    ) public initializer {
        require(escrowAddress != address(0), "Cannot initialize escrowAddress with 0 address");
        require(governanceAddress_ != address(0), "Cannot initialize governanceAddress_ with 0 address");
        require(fundingNFT_ != address(0), "Cannot initialize fundingNFT_ with 0 address");
        require(projectManager_ != address(0), "Cannot initialize projectManager with 0 address");
        require(baseAmountForEachPartition_ != 0, "Cannot initialize baseAmountForEachPartition_ with 0");

        __ReentrancyGuard_init();
        __BaseProject_init();

        escrow = IEscrow(escrowAddress);
        baseAmountForEachPartition = baseAmountForEachPartition_;
        governance = IGovernance(governanceAddress_);
        fundingNFT = IERC1155Mint(fundingNFT_);
        projectManager = IProjectManager(projectManager_);

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
     * @notice Decide For Investment
     * @dev This function is called by governance to approve or reject a investment request.
     * @param projectId The id of the investment.
     * @param decision The decision of the governance. [true -> approved] [false -> rejected]
     */
    function decideForProject(uint256 projectId, bool decision) external onlyGovernance() {
        if (decision) _approveInvestment(projectId);
        else _rejectInvestment(projectId);
    }

    /**
     * @notice Start Lottery Phase
     * @dev This function is called by governance to start the lottery phase for an investment.
     * @param projectId The id of the investment.
     */
    function startLotteryPhase(uint256 projectId) external onlyGovernance() {
        _startInvestment(projectId);
    }

    /**
     * @notice Approve Investment
     * @param projectId_ The id of the investment.
     */
    function _approveInvestment(uint256 projectId_) internal {
        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.APPROVED;
        investmentDetails[projectId_].approvalDate = block.timestamp;
        ticketsRemaining[projectId_] = investmentDetails[projectId_].totalPartitionsToBePurchased;
        governance.storeInvestmentTriggering(projectId_);
        emit ProjectApproved(projectId_);
    }

    /**
     * @notice Reject Investment
     * @param projectId_ The id of the investment.
     */
    function _rejectInvestment(uint256 projectId_) internal {
        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.REJECTED;
        escrow.transferInvestmentToken(
            investmentDetails[projectId_].investmentToken,
            projectSeeker[projectId_],
            investmentDetails[projectId_].investmentTokensAmount
        );
        emit ProjectRejected(projectId_);
    }

    /**
     * @notice Start Investment
     * @param projectId_ The id of the investment.
     */
    function _startInvestment(uint256 projectId_) internal {
        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.STARTED;
        investmentDetails[projectId_].startingDate = block.timestamp;

        emit ProjectStarted(projectId_);
    }

    /**
     * @notice Get Investment Metadata
     * @dev This helper function provides a single point for querying the Investment metadata
     * @param projectId The id of the investment.
     * @dev returns Investment Details, Investment Status, Investment Seeker Address and Repayment Batch Type
     */
    function getInvestmentMetadata(uint256 projectId)
        public
        view
        returns (
            ProjectLibrary.InvestmentDetails memory, // the investmentDetails
            ProjectLibrary.ProjectStatus, // the projectStatus
            address // the projectSeeker
        )
    {
        return (
            investmentDetails[projectId],
            projectStatus[projectId],
            projectSeeker[projectId]
        );
    }

    /**
     * @notice IsValidReferralId
     * @param projectId The id of the investment.
     * @dev returns true if investment id exists (so also seeker exists), otherwise returns false
     */
    function isValidReferralId(uint256 projectId) external view returns (bool) {
        return projectSeeker[projectId] != address(0);
    }

    /**
     * @notice Requests investment
     * @dev This function is used for seekers to request investment in exchange for investment tokens.
     * @dev require valid amount
     * @param investmentToken The token that will be purchased by investors.
     * @param amountOfInvestmentTokens The amount of investment tokens to be purchased.
     * @param lendingToken The token that investors will pay with.
     * @param totalAmountRequested_ The total amount requested so as all investment tokens to be sold.
     * @param extraInfo The ipfs hash where more specific details for investment request are stored.
     */
    function requestInvestment(
        address investmentToken,
        uint256 amountOfInvestmentTokens,
        address lendingToken,
        uint256 totalAmountRequested_,
        string calldata extraInfo
    ) external nonReentrant() {
        require(isValidLendingToken[lendingToken], "Lending token not supported");

        require(
            totalAmountRequested_.mod(baseAmountForEachPartition) == 0 &&
                amountOfInvestmentTokens.mod(totalAmountRequested_.div(baseAmountForEachPartition)) == 0,
            "Token amount and price should result in integer amount of tickets"
        );

        uint256 projectId = _storeInvestmentDetails(
            lendingToken,
            totalAmountRequested_,
            investmentToken,
            amountOfInvestmentTokens,
            extraInfo
        );

        IERC20(investmentToken).safeTransferFrom(msg.sender, address(escrow), amountOfInvestmentTokens);

        fundingNFT.mintGen0(address(escrow), investmentDetails[projectId].totalPartitionsToBePurchased, projectId);

        investmentTokensPerTicket[projectId] = amountOfInvestmentTokens.div(investmentDetails[projectId].totalPartitionsToBePurchased);

        fundingNFT.pauseTokenTransfer(projectId); //Pause trades for ERC1155s with the specific investment ID.

        governance.requestApproval(projectId);

        // Add event for investment request
        emit ProjectRequested(projectId, msg.sender, totalAmountRequested_);

    }

    /**
     * @notice user show interest for investment
     * @dev This function is called by the investors who are interested to invest in a specific investment token.
     * @dev require Approval state and valid partition
     * @param projectId The id of the investment.
     * @param amountOfPartitions The amount of partitions this specific investor wanna invest in.
     */
    function showInterestForInvestment(uint256 projectId, uint256 amountOfPartitions) external  nonReentrant() {
        require(
            projectStatus[projectId] == ProjectLibrary.ProjectStatus.APPROVED,
            "Can show interest only in Approved state"
        );
        require(amountOfPartitions > 0, "Cannot show interest for 0 partitions");

        IERC20(investmentDetails[projectId].lendingToken).safeTransferFrom(
            msg.sender, address(escrow), amountOfPartitions.mul(baseAmountForEachPartition)
        );

        investmentDetails[projectId].partitionsRequested = investmentDetails[projectId].partitionsRequested.add(
            amountOfPartitions
        );

        // if it's not the first time calling the function lucky numbers are not provided again.
        if (remainingTicketsPerAddress[projectId][msg.sender] > 0 || ticketsWonPerAddress[projectId][msg.sender] > 0) {
            remainingTicketsPerAddress[projectId][msg.sender] =
                remainingTicketsPerAddress[projectId][msg.sender].add(amountOfPartitions);
        }
        else {
            _applyImmediateTicketsAndProvideLuckyNumbers(projectId, amountOfPartitions);
        }

        // Add event for investment interest
        emit ProjectInterest(projectId, amountOfPartitions);

    }

    function _applyImmediateTicketsAndProvideLuckyNumbers(uint256 projectId_, uint256 amountOfPartitions_) internal {
        uint256 reputationalBalance = _updateReputationalBalanceForPreviouslyLockedTokens();
        uint256 totalLotteryNumbers = reputationalBalance.div(rAlbtPerLotteryNumber);

        if (totalLotteryNumbers == 0) revert("Not eligible for lottery numbers");

        uint256 immediateTickets = 0;

        if (totalLotteryNumbers > lotteryNumbersForImmediateTicket) {
            // Calculated this way so as to avoid users from taking immediateTickets without lottery numbers in case
            // totalLotteryNumbers.mod(lotteryNumbersForImmediateTicket) == 0
            uint256 rest = (totalLotteryNumbers.sub(1)).mod(lotteryNumbersForImmediateTicket).add(1);
            immediateTickets = totalLotteryNumbers.sub(rest).div(lotteryNumbersForImmediateTicket);
            totalLotteryNumbers = rest;
        }

        if (immediateTickets > amountOfPartitions_) immediateTickets = amountOfPartitions_;

        if (immediateTickets > 0) {
            // Just in case we provided immediate tickets and tickets finished, so there is no lottery in this case.
            if (immediateTickets >= ticketsRemaining[projectId_]) {
                immediateTickets = ticketsRemaining[projectId_];
                projectStatus[projectId_] = ProjectLibrary.ProjectStatus.SETTLED;
                fundingNFT.unpauseTokenTransfer(projectId_); // UnPause trades for ERC1155s with the specific investment ID.
                emit ProjectSettled(projectId_);
            }

            ticketsWonPerAddress[projectId_][msg.sender] = immediateTickets;
            ticketsRemaining[projectId_] = ticketsRemaining[projectId_].sub(immediateTickets);
        }

        remainingTicketsPerAddress[projectId_][msg.sender] = amountOfPartitions_.sub(immediateTickets);

        uint256 maxLotteryNumber = totalLotteryNumbersPerInvestment[projectId_].add(totalLotteryNumbers);

        for (uint256 i = totalLotteryNumbersPerInvestment[projectId_].add(1); i <= maxLotteryNumber; i++) {
            addressOfLotteryNumber[projectId_][i] = msg.sender;
        }

        totalLotteryNumbersPerInvestment[projectId_] = maxLotteryNumber;
    }

    /**
     * @notice Executes lottery run
     * @dev This function is called by any investor interested in an Investment Token to run part of the lottery.
     * @dev requires Started state and available tickets
     * @param projectId The id of the investment.
     */
    function executeLotteryRun(uint256 projectId) external {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.STARTED, "Can run lottery only in Started state");
        require(
            remainingTicketsPerAddress[projectId][msg.sender] > 0,
            "Can run lottery only if has remaining ticket"
        );

        ticketsWonPerAddress[projectId][msg.sender] = ticketsWonPerAddress[projectId][msg.sender].add(1);
        remainingTicketsPerAddress[projectId][msg.sender] = remainingTicketsPerAddress[projectId][msg.sender].sub(
            1
        );
        ticketsRemaining[projectId] = ticketsRemaining[projectId].sub(1);

        uint256 counter = totalTicketsPerRun;
        uint256 maxNumber = totalLotteryNumbersPerInvestment[projectId];

        if (ticketsRemaining[projectId] <= counter) {
            projectStatus[projectId] = ProjectLibrary.ProjectStatus.SETTLED;
            counter = ticketsRemaining[projectId];
            ticketsRemaining[projectId] = 0;
            fundingNFT.unpauseTokenTransfer(projectId); // UnPause trades for ERC1155s with the specific investment ID.
            emit ProjectSettled(projectId);
        } else {
            ticketsRemaining[projectId] = ticketsRemaining[projectId].sub(counter);
        }

        while (counter > 0) {
            uint256 randomNumber = _getRandomNumber(maxNumber);
            lotteryNonce = lotteryNonce.add(1);

            address randomAddress = addressOfLotteryNumber[projectId][randomNumber.add(1)];

            if (remainingTicketsPerAddress[projectId][randomAddress] > 0) {
                remainingTicketsPerAddress[projectId][randomAddress] = remainingTicketsPerAddress[projectId][
                    randomAddress
                ]
                    .sub(1);

                ticketsWonPerAddress[projectId][randomAddress] = ticketsWonPerAddress[projectId][randomAddress]
                    .add(1);

                counter--;
            }
        }

        // Add event for lottery executed
        emit LotteryExecuted(projectId);
    }

    /**
     * @notice Withdraw Investment Tickets
     * @dev This function is called by an investor to withdraw his tickets.
     * @dev require Settled state and enough tickets won
     * @param projectId The id of the investment.
     * @param ticketsToLock The amount of won tickets to be locked, so as to get more rALBT.
     * @param ticketsToWithdraw The amount of won tickets to be withdrawn instantly.
     */
    function withdrawInvestmentTickets(
        uint256 projectId,
        uint256 ticketsToLock,
        uint256 ticketsToWithdraw
    ) external  nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can withdraw only in Settled state");
        require(
            ticketsWonPerAddress[projectId][msg.sender] > 0 &&
                ticketsWonPerAddress[projectId][msg.sender] >= ticketsToLock.add(ticketsToWithdraw),
            "Not enough tickets won"
        );

        ticketsWonPerAddress[projectId][msg.sender] = ticketsWonPerAddress[projectId][msg.sender]
            .sub(ticketsToLock)
            .sub(ticketsToWithdraw);

        _updateReputationalBalanceForPreviouslyLockedTokens();

        if (ticketsToLock > 0) {
            lockedTicketsForSpecificInvestmentPerAddress[projectId][
                msg.sender
            ] = lockedTicketsForSpecificInvestmentPerAddress[projectId][msg.sender].add(ticketsToLock);

            lockedTicketsPerAddress[msg.sender] = lockedTicketsPerAddress[msg.sender].add(ticketsToLock);
        }

        if (ticketsToWithdraw > 0) {
            escrow.transferFundingNFT(projectId, ticketsToWithdraw, msg.sender);
        }

        if (remainingTicketsPerAddress[projectId][msg.sender] > 0) {
            _withdrawAmountProvidedForNonWonTickets(projectId);
        }

        // Add event for withdraw investment
        emit WithdrawProjectTickets(projectId, ticketsToLock, ticketsToWithdraw);
    }

    /**
     * @dev This function is called by an investor to withdraw lending tokens provided for non-won tickets.
     * @param projectId The id of the investment.
     */
    function withdrawAmountProvidedForNonWonTickets(uint256 projectId) external nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can withdraw only in Settled state");
        require(remainingTicketsPerAddress[projectId][msg.sender] > 0, "No non-won tickets to withdraw");

        _withdrawAmountProvidedForNonWonTickets(projectId);
    }

    /**
     * @notice Withdraw locked investment ticket.
     * @dev This function is called by an investor to withdraw his locked tickets.
     * @dev requires Settled state and available tickets.
     * @param projectId The id of the investment.
     * @param ticketsToWithdraw The amount of locked tickets to be withdrawn.
     */
    function withdrawLockedInvestmentTickets(uint256 projectId, uint256 ticketsToWithdraw) external nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can withdraw only in Settled state");
        require(
            ticketsToWithdraw > 0 &&
                lockedTicketsForSpecificInvestmentPerAddress[projectId][msg.sender] >= ticketsToWithdraw,
            "Not enough tickets to withdraw"
        );

        _updateReputationalBalanceForPreviouslyLockedTokens();

        lockedTicketsForSpecificInvestmentPerAddress[projectId][
            msg.sender
        ] = lockedTicketsForSpecificInvestmentPerAddress[projectId][msg.sender].sub(ticketsToWithdraw);

        lockedTicketsPerAddress[msg.sender] = lockedTicketsPerAddress[msg.sender].sub(ticketsToWithdraw);

        escrow.transferFundingNFT(projectId, ticketsToWithdraw, msg.sender);

        // Add event for withdraw locked investment tickets
        emit WithdrawLockedProjectTickets(projectId, ticketsToWithdraw);
    }

    /**
     * @dev This function is called by the seeker to withdraw the lending tokens provided by investors after lottery ends.
     * @param projectId The id of the investment.
     */
    function withdrawInvestment(uint256 projectId) external nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can withdraw only in Settled state");
        require(projectSeeker[projectId] == msg.sender, "Only seeker can withdraw");
        require(!investmentWithdrawn[projectId], "Already withdrawn");

        uint256 amountToWithdraw = investmentDetails[projectId].totalAmountToBeRaised;
        investmentWithdrawn[projectId] = true;

        escrow.transferLendingToken(investmentDetails[projectId].lendingToken, msg.sender, amountToWithdraw);
        emit seekerWithdrawInvestment(projectId, amountToWithdraw);
    }

    /**
     * @notice Gets Requesting status
     * @dev Returns true if investors have shown interest for equal or more than the total tickets.
     * @param projectId The id of the investment type to be checked.
     */
    function getRequestingInterestStatus(uint256 projectId) external view returns (bool) {
        return investmentDetails[projectId].totalPartitionsToBePurchased <= investmentDetails[projectId].partitionsRequested;
    }

    /**
     * @notice Generates Random Number
     * @dev This function generates a random number
     * @param maxNumber the max number possible
     * @return randomNumber the random number generated
     */
    function _getRandomNumber(uint256 maxNumber) internal view returns (uint256 randomNumber) {
        randomNumber = uint256(
            keccak256(
                abi.encodePacked(block.difficulty, block.timestamp, lotteryNonce, blockhash(block.number), msg.sender)
            )
        )
            .mod(maxNumber);
    }

    /**
     * @notice Updates reputation balance
     * @dev updates balance of reputation for locked tokens
     * @return the reputation balance of msg.sender
     */
    function _updateReputationalBalanceForPreviouslyLockedTokens() internal returns (uint256) {
        if (lockedTicketsPerAddress[msg.sender] > 0) {
            // Decimals for rALBT => 18
            uint256 amountOfReputationalAlbtPerTicket =
                (block.number.sub(lastBlockCheckedForLockedTicketsPerAddress[msg.sender])).mul(10**18).div(
                    blocksLockedForReputation
                );

            uint256 amountOfReputationalAlbtToMint =
                amountOfReputationalAlbtPerTicket.mul(lockedTicketsPerAddress[msg.sender]);

            escrow.mintReputationalToken(msg.sender, amountOfReputationalAlbtToMint);

            lastBlockCheckedForLockedTicketsPerAddress[msg.sender] = block.number;
        }

        return rALBT.balanceOf(msg.sender);
    }

    function _withdrawAmountProvidedForNonWonTickets(uint256 projectId_) internal {
        uint256 amountToReturnForNonWonTickets =
            remainingTicketsPerAddress[projectId_][msg.sender].mul(baseAmountForEachPartition);
        remainingTicketsPerAddress[projectId_][msg.sender] = 0;

        escrow.transferLendingToken(investmentDetails[projectId_].lendingToken, msg.sender, amountToReturnForNonWonTickets);

        // Add event for withdraw amount provided for non tickets
        emit WithdrawAmountForNonTickets(projectId_, amountToReturnForNonWonTickets);
    }

    /**
     * @notice Convert NFT to investment tokens
     * @param projectId the projectId
     * @param amountOfNFTToConvert the amount of nft to convert
     */
    function convertNFTToInvestmentTokens (uint256 projectId, uint256 amountOfNFTToConvert) external nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can withdraw only in Settled state");
        require(amountOfNFTToConvert != 0, "Amount of nft to convert cannot be 0");
        require(amountOfNFTToConvert <= fundingNFT.balanceOf(msg.sender, projectId), "Not enough NFT to convert");

        uint256 amountOfInvestmentTokenToTransfer = investmentTokensPerTicket[projectId].mul(amountOfNFTToConvert);

        escrow.burnFundingNFT(msg.sender, projectId, amountOfNFTToConvert);
        escrow.transferInvestmentToken(investmentDetails[projectId].investmentToken, msg.sender, amountOfInvestmentTokenToTransfer);

        // Add event for convert nft to investment tokens
        emit ConvertNFTToProjectTokens(projectId, amountOfNFTToConvert, amountOfInvestmentTokenToTransfer);
    }
}
