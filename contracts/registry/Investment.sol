// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "./InvestmentDetails.sol";
import "../libs/SafeERC20.sol";
import "../libs/TokenFormat.sol";

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
    event InvestmentRequested(uint256 indexed investmentId, address indexed user, uint256 amount);
    event InvestmentInterest(uint256 indexed investmentId, address indexed user, uint256 amount);
    event LotteryExecuted(uint256 indexed investmentId);
    event ConvertInvestmentTickets(uint256 indexed investmentId, address indexed user, uint256 amount);
    event LockInvestmentNfts(uint256 indexed investmentId, address indexed user, uint256 amountOfNfts);
    event seekerWithdrawInvestment(uint256 indexed investmentId, uint256 amountWithdrawn);
    event WithdrawAmountForNonTickets(uint256 indexedinvestmentId, uint256 amountToReturnForNonWonTickets);
    event WithdrawLockedInvestmentNfts(uint256 indexedinvestmentId, uint256 nftsToWithdraw);
    event ConvertNFTToInvestmentTokens(uint256 indexedinvestmentId, uint256 amountOfNFTToConvert, uint256 amountOfInvestmentTokenToTransfer);
    event InvestmentSettled(uint256 investmentId);

    function __Investment_init() public initializer {
        __ReentrancyGuard_init();
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

        uint256 investmentId = _storeInvestmentDetails(
            lendingToken,
            totalAmountRequested_,
            investmentToken,
            amountOfInvestmentTokens,
            extraInfo
        );

        IERC20(investmentToken).safeTransferFrom(msg.sender, address(escrow), amountOfInvestmentTokens);

        fundingNFT.mintGen0(address(escrow), investmentDetails[investmentId].totalPartitionsToBePurchased, investmentId);

        investmentTokensPerTicket[investmentId] = amountOfInvestmentTokens.div(investmentDetails[investmentId].totalPartitionsToBePurchased);

        fundingNFT.pauseTokenTransfer(investmentId); //Pause trades for ERC1155s with the specific investment ID.

        governance.requestApproval(investmentId);

        // Add event for investment request
        emit InvestmentRequested(investmentId, msg.sender, totalAmountRequested_);

    }

    /**
     * @notice user show interest for investment
     * @dev This function is called by the investors who are interested to invest in a specific investment token.
     * @dev require Approval state and valid partition
     * @param investmentId The id of the investment.
     * @param amountOfPartitions The amount of partitions this specific investor wanna invest in.
     */
    function showInterestForInvestment(uint256 investmentId, uint256 amountOfPartitions) external  nonReentrant() {
        require(
            investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.APPROVED,
            "Can show interest only in Approved state"
        );
        require(amountOfPartitions > 0, "Cannot show interest for 0 partitions");

        IERC20(investmentDetails[investmentId].lendingToken).safeTransferFrom(
            msg.sender, address(escrow), amountOfPartitions.mul(baseAmountForEachPartition)
        );

        investmentDetails[investmentId].partitionsRequested = investmentDetails[investmentId].partitionsRequested.add(
            amountOfPartitions
        );

        // if it's not the first time calling the function lucky numbers are not provided again.
        if (remainingTicketsPerAddress[investmentId][msg.sender] > 0 || ticketsWonPerAddress[investmentId][msg.sender] > 0) {
            remainingTicketsPerAddress[investmentId][msg.sender] =
                remainingTicketsPerAddress[investmentId][msg.sender].add(amountOfPartitions);
        }
        else {
            _applyImmediateTicketsAndProvideLuckyNumbers(investmentId, amountOfPartitions);
        }

        // Add event for investment interest
        emit InvestmentInterest(investmentId, msg.sender, amountOfPartitions);

    }

    function _applyImmediateTicketsAndProvideLuckyNumbers(uint256 investmentId_, uint256 amountOfPartitions_) internal {
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
            if (immediateTickets >= ticketsRemaining[investmentId_]) {
                immediateTickets = ticketsRemaining[investmentId_];
                investmentStatus[investmentId_] = InvestmentLibrary.InvestmentStatus.SETTLED;
                fundingNFT.unpauseTokenTransfer(investmentId_); // UnPause trades for ERC1155s with the specific investment ID.
                emit InvestmentSettled(investmentId_);
            }

            ticketsWonPerAddress[investmentId_][msg.sender] = immediateTickets;
            ticketsRemaining[investmentId_] = ticketsRemaining[investmentId_].sub(immediateTickets);
        }

        remainingTicketsPerAddress[investmentId_][msg.sender] = amountOfPartitions_.sub(immediateTickets);

        uint256 maxLotteryNumber = totalLotteryNumbersPerInvestment[investmentId_].add(totalLotteryNumbers);

        for (uint256 i = totalLotteryNumbersPerInvestment[investmentId_].add(1); i <= maxLotteryNumber; i++) {
            addressOfLotteryNumber[investmentId_][i] = msg.sender;
        }

        totalLotteryNumbersPerInvestment[investmentId_] = maxLotteryNumber;
    }

    /**
     * @notice Executes lottery run
     * @dev This function is called by any investor interested in an Investment Token to run part of the lottery.
     * @dev requires Started state and available tickets
     * @param investmentId The id of the investment.
     */
    function executeLotteryRun(uint256 investmentId) external {
        require(investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.STARTED, "Can run lottery only in Started state");
        require(
            remainingTicketsPerAddress[investmentId][msg.sender] > 0,
            "Can run lottery only if has remaining ticket"
        );

        ticketsWonPerAddress[investmentId][msg.sender] = ticketsWonPerAddress[investmentId][msg.sender].add(1);
        remainingTicketsPerAddress[investmentId][msg.sender] = remainingTicketsPerAddress[investmentId][msg.sender].sub(
            1
        );
        ticketsRemaining[investmentId] = ticketsRemaining[investmentId].sub(1);

        uint256 counter = totalTicketsPerRun;
        uint256 maxNumber = totalLotteryNumbersPerInvestment[investmentId];

        if (ticketsRemaining[investmentId] <= counter) {
            investmentStatus[investmentId] = InvestmentLibrary.InvestmentStatus.SETTLED;
            counter = ticketsRemaining[investmentId];
            ticketsRemaining[investmentId] = 0;
            fundingNFT.unpauseTokenTransfer(investmentId); // UnPause trades for ERC1155s with the specific investment ID.
            emit InvestmentSettled(investmentId);
        } else {
            ticketsRemaining[investmentId] = ticketsRemaining[investmentId].sub(counter);
        }

        while (counter > 0) {
            uint256 randomNumber = _getRandomNumber(maxNumber);
            lotteryNonce = lotteryNonce.add(1);

            address randomAddress = addressOfLotteryNumber[investmentId][randomNumber.add(1)];

            if (remainingTicketsPerAddress[investmentId][randomAddress] > 0) {
                remainingTicketsPerAddress[investmentId][randomAddress] = remainingTicketsPerAddress[investmentId][
                    randomAddress
                ]
                    .sub(1);

                ticketsWonPerAddress[investmentId][randomAddress] = ticketsWonPerAddress[investmentId][randomAddress]
                    .add(1);

                counter--;
            }
        }

        // Add event for lottery executed
        emit LotteryExecuted(investmentId);
    }

    /**
     * @notice Convert Investment Tickets to Nfts.
     * @dev This function is called by an investor to convert his tickets won to NFTs.
     * @dev require Settled state and enough tickets won
     * @param investmentId The id of the investment.
     */
    function convertInvestmentTicketsToNfts(
        uint256 investmentId
    ) external  nonReentrant() {
        require(investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.SETTLED, "Can convert only in Settled state");
        require(
            ticketsWonPerAddress[investmentId][msg.sender] > 0,
            "Not enough tickets won"
        );

        uint256 ticketsToConvert = ticketsWonPerAddress[investmentId][msg.sender];
        ticketsWonPerAddress[investmentId][msg.sender] = 0;

        escrow.transferFundingNFT(investmentId, ticketsToConvert, msg.sender);

        if (remainingTicketsPerAddress[investmentId][msg.sender] > 0) {
            _withdrawAmountProvidedForNonWonTickets(investmentId);
        }

        emit ConvertInvestmentTickets(investmentId, msg.sender, ticketsToConvert);
    }

    /**
     * @dev This function is called by a investment nft holder to lock part of his nfts.
     * @param investmentId The id of the investment.
     * @param nftsToLock The amount of nfts to lock.
     */
    function lockInvestmentNfts(uint256 investmentId, uint256 nftsToLock) external nonReentrant() {
        require(fundingNFT.balanceOf(msg.sender, investmentId) >= nftsToLock, "Not enough nfts");

        escrow.lockFundingNFT(investmentId, nftsToLock, msg.sender);

        _updateReputationalBalanceForPreviouslyLockedTokens();

        lockedNftsForSpecificInvestmentPerAddress[investmentId][
            msg.sender
        ] = lockedNftsForSpecificInvestmentPerAddress[investmentId][msg.sender].add(nftsToLock);

        lockedNftsPerAddress[msg.sender] = lockedNftsPerAddress[msg.sender].add(nftsToLock);

        emit LockInvestmentNfts(investmentId, msg.sender, nftsToLock);
    }

    /**
     * @dev This function is called by an investor to withdraw lending tokens provided for non-won tickets.
     * @param investmentId The id of the investment.
     */
    function withdrawAmountProvidedForNonWonTickets(uint256 investmentId) external nonReentrant() {
        require(investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.SETTLED, "Can withdraw only in Settled state");
        require(remainingTicketsPerAddress[investmentId][msg.sender] > 0, "No non-won tickets to withdraw");

        _withdrawAmountProvidedForNonWonTickets(investmentId);
    }

    /**
     * @notice Withdraw locked investment nfts.
     * @dev This function is called by an investor to withdraw his locked tickets.
     * @dev requires Settled state and available tickets.
     * @param investmentId The id of the investment.
     * @param nftsToWithdraw The amount of locked nfts to be withdrawn.
     */
    function withdrawLockedInvestmentNfts(uint256 investmentId, uint256 nftsToWithdraw) external nonReentrant() {
        require(investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.SETTLED, "Can withdraw only in Settled state");
        require(
            nftsToWithdraw > 0 &&
                lockedNftsForSpecificInvestmentPerAddress[investmentId][msg.sender] >= nftsToWithdraw,
            "Not enough nfts to withdraw"
        );

        _updateReputationalBalanceForPreviouslyLockedTokens();

        lockedNftsForSpecificInvestmentPerAddress[investmentId][
            msg.sender
        ] = lockedNftsForSpecificInvestmentPerAddress[investmentId][msg.sender].sub(nftsToWithdraw);

        lockedNftsPerAddress[msg.sender] = lockedNftsPerAddress[msg.sender].sub(nftsToWithdraw);

        escrow.transferFundingNFT(investmentId, nftsToWithdraw, msg.sender);

        // Add event for withdraw locked investment tickets
        emit WithdrawLockedInvestmentNfts(investmentId, nftsToWithdraw);
    }

    /**
     * @dev This function is called by the seeker to withdraw the lending tokens provided by investors after lottery ends.
     * @param investmentId The id of the investment.
     */
    function withdrawInvestment(uint256 investmentId) external nonReentrant() {
        require(investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.SETTLED, "Can withdraw only in Settled state");
        require(investmentSeeker[investmentId] == msg.sender, "Only seeker can withdraw");
        require(!investmentWithdrawn[investmentId], "Already withdrawn");
        
        uint256 amountToWithdraw = investmentDetails[investmentId].totalAmountToBeRaised;
        investmentWithdrawn[investmentId] = true;

        escrow.transferLendingToken(investmentDetails[investmentId].lendingToken, msg.sender, amountToWithdraw);
        emit seekerWithdrawInvestment(investmentId, amountToWithdraw);
    }

    /**
     * @notice Gets Requesting status
     * @dev Returns true if investors have shown interest for equal or more than the total tickets.
     * @param investmentId The id of the investment type to be checked.
     */
    function getRequestingInterestStatus(uint256 investmentId) external view returns (bool) {
        return investmentDetails[investmentId].totalPartitionsToBePurchased <= investmentDetails[investmentId].partitionsRequested;
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
        if (lockedNftsPerAddress[msg.sender] > 0) {
            // Decimals for rALBT => 18
            uint256 amountOfReputationalAlbtPerTicket =
                (block.number.sub(lastBlockCheckedForLockedNftsPerAddress[msg.sender])).mul(10**18).div(
                    blocksLockedForReputation
                );

            uint256 amountOfReputationalAlbtToMint =
                amountOfReputationalAlbtPerTicket.mul(lockedNftsPerAddress[msg.sender]);

            escrow.mintReputationalToken(msg.sender, amountOfReputationalAlbtToMint);

            lastBlockCheckedForLockedNftsPerAddress[msg.sender] = block.number;
        }

        return rALBT.balanceOf(msg.sender);
    }

    function _withdrawAmountProvidedForNonWonTickets(uint256 investmentId_) internal {
        uint256 amountToReturnForNonWonTickets =
            remainingTicketsPerAddress[investmentId_][msg.sender].mul(baseAmountForEachPartition);
        remainingTicketsPerAddress[investmentId_][msg.sender] = 0;

        escrow.transferLendingToken(investmentDetails[investmentId_].lendingToken, msg.sender, amountToReturnForNonWonTickets);

        // Add event for withdraw amount provided for non tickets
        emit WithdrawAmountForNonTickets(investmentId_, amountToReturnForNonWonTickets);
    }

    /**
     * @notice Convert NFT to investment tokens
     * @param investmentId the investmentId
     * @param amountOfNFTToConvert the amount of nft to convert
     */
    function convertNFTToInvestmentTokens (uint256 investmentId, uint256 amountOfNFTToConvert) external {
        require(investmentStatus[investmentId] == InvestmentLibrary.InvestmentStatus.SETTLED, "Can withdraw only in Settled state");
        require(amountOfNFTToConvert != 0, "Amount of nft to convert cannot be 0");
        require(amountOfNFTToConvert <= fundingNFT.balanceOf(msg.sender, investmentId), "Not enough NFT to convert");

        uint256 amountOfInvestmentTokenToTransfer = investmentTokensPerTicket[investmentId].mul(amountOfNFTToConvert);

        escrow.burnFundingNFT(msg.sender, investmentId, amountOfNFTToConvert);
        escrow.transferInvestmentToken(investmentDetails[investmentId].investmentToken, msg.sender, amountOfInvestmentTokenToTransfer);

        // Add event for convert nft to investment tokens
        emit ConvertNFTToInvestmentTokens(investmentId, amountOfNFTToConvert, amountOfInvestmentTokenToTransfer);
    }
}
