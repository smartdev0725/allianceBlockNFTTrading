// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LoanDetails.sol";
import "../libs/TokenFormat.sol";

/**
 * @title AllianceBlock Investment contract
 * @notice Functionality for Investment.
 * @dev Extends LoanDetails
*/
contract Investment is LoanDetails {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // TODO - EVENTS

    /**
     * @notice Requests investment
     * @dev This function is used for projects to request investment in exchange for project tokens.
     * @dev require valid amount
     * @param investmentToken The token that will be purchased by investors.
     * @param amountOfInvestmentTokens The amount of investment tokens to be purchased.
     * @param totalAmountRequested_ The total amount requested so as all investment tokens to be sold.
     * @param extraInfo The ipfs hash where more specific details for loan request are stored.
    */
    function requestInvestment(
        address investmentToken,
        uint256 amountOfInvestmentTokens,
        uint256 totalAmountRequested_,
        string memory extraInfo
    ) external {
        // TODO - Change 10 ** 18 to decimals if needed.
        require(
            totalAmountRequested_.mod(baseAmountForEachPartition) == 0 &&
            totalAmountRequested_.mul(10**18).mod(amountOfInvestmentTokens) == 0,
            "Token amount and price should result in integer amount of tickets"
        );

        _storeLoanDetails(
            LoanLibrary.LoanType.INVESTMENT,
            totalAmountRequested_,
            investmentToken,
            amountOfInvestmentTokens,
            0,
            extraInfo
        );

        IERC20(investmentToken).transferFrom(
            msg.sender,
            address(escrow),
            amountOfInvestmentTokens
        );

        fundingNFT.mintGen0(
            address(escrow),
            loanDetails[totalLoans].totalPartitions,
            totalLoans
        );

        investmentTokensPerTicket[totalLoans] = amountOfInvestmentTokens.div(
            loanDetails[totalLoans].totalPartitions);

        fundingNFT.pauseTokenTransfer(totalLoans); //Pause trades for ERC1155s with the specific loan ID.

        governance.requestApproval(totalLoans, false, 0);

        // Add event for investment request

        totalLoans = totalLoans.add(1);
    }

    /**
     * @notice user show interest for investment
     * @dev This function is called by the investors who are interested to invest in a specific project.
     * @dev require Approval state and valid partition
     * @param investmentId The id of the investment.
     * @param amountOfPartitions The amount of partitions this specific investor wanna invest in.
    */
    function showInterestForInvestment(uint256 investmentId, uint256 amountOfPartitions)
        external
    {
        require(loanStatus[investmentId] == LoanLibrary.LoanStatus.APPROVED, "Can show interest only in Approved state");
        require(amountOfPartitions > 0, "Cannot show interest for 0 partitions");

        lendingToken.transferFrom(
            msg.sender,
            address(escrow),
            amountOfPartitions.mul(baseAmountForEachPartition)
        );

        loanDetails[investmentId].partitionsPurchased = loanDetails[investmentId].partitionsPurchased.add(amountOfPartitions);

        uint256 reputationalBalance = _updateReputationalBalanceForPreviouslyLockedTokens();
        uint256 totalLotteryNumbers = reputationalBalance.div(rAlbtPerLotteryNumber);

        if (totalLotteryNumbers == 0) return; // Maybe revert here?

        uint256 immediateTickets;

        // TODO - Explain this check to Rachid.
        while (totalLotteryNumbers > lotteryNumbersForImmediateTicket) {
            immediateTickets = immediateTickets.add(1);
            totalLotteryNumbers = totalLotteryNumbers.sub(lotteryNumbersForImmediateTicket);
        }

        if (immediateTickets > amountOfPartitions) immediateTickets = amountOfPartitions;

        // Just in case we provided immediate tickets and tickets finished, so there is no lottery in this case.
        if (immediateTickets > ticketsRemaining[investmentId]) {
            immediateTickets = ticketsRemaining[investmentId];
            loanStatus[investmentId] = LoanLibrary.LoanStatus.SETTLED;

            // Maybe also stop the procedure here.
        }

        if (immediateTickets > 0) {
            ticketsWonPerAddress[investmentId][msg.sender] = immediateTickets;
            ticketsRemaining[investmentId] = ticketsRemaining[investmentId].sub(immediateTickets);
        }

        remainingTicketsPerAddress[investmentId][msg.sender] = amountOfPartitions.sub(immediateTickets);

        uint256 maxLotteryNumber = totalLotteryNumbersPerInvestment[investmentId].add(totalLotteryNumbers);

        for (uint256 i = totalLotteryNumbersPerInvestment[investmentId].add(1); i <= maxLotteryNumber; i++) {
            addressOfLotteryNumber[investmentId][i] = msg.sender;
        }

        totalLotteryNumbersPerInvestment[investmentId] = maxLotteryNumber;
    }

    /**
     * @notice Executes lottery run
     * @dev This function is called by any investor interested in a project to run part of the lottery.
     * @dev requires Started state and available tickets
     * @param investmentId The id of the investment.
    */
    function executeLotteryRun(uint256 investmentId)
        external
    {
        require(loanStatus[investmentId] == LoanLibrary.LoanStatus.STARTED, "Can run lottery only in Started state");
        require(remainingTicketsPerAddress[investmentId][msg.sender] > 0, "Can run lottery only if has remaining ticket");

        ticketsWonPerAddress[investmentId][msg.sender] = ticketsWonPerAddress[investmentId][msg.sender].add(1);
        remainingTicketsPerAddress[investmentId][msg.sender] = remainingTicketsPerAddress[investmentId][msg.sender].sub(1);
        ticketsRemaining[investmentId] = ticketsRemaining[investmentId].sub(1);

        uint256 counter = totalTicketsPerRun;
        uint256 maxNumber = totalLotteryNumbersPerInvestment[investmentId];

        if (ticketsRemaining[investmentId] <= counter) {
            loanStatus[investmentId] = LoanLibrary.LoanStatus.SETTLED;
            counter = ticketsRemaining[investmentId];
            ticketsRemaining[investmentId] = 0;
        } else {
            ticketsRemaining[investmentId] = ticketsRemaining[investmentId].sub(counter);
        }

        while (counter != 0) {
            uint256 randomNumber = getRandomNumber(maxNumber);
            lotteryNonce = lotteryNonce.add(1);

            address randomAddress = addressOfLotteryNumber[investmentId][randomNumber.add(1)];

            if (remainingTicketsPerAddress[investmentId][randomAddress] > 0) {
                remainingTicketsPerAddress[investmentId][randomAddress] =
                    remainingTicketsPerAddress[investmentId][randomAddress].sub(1);

                ticketsWonPerAddress[investmentId][randomAddress] =
                    ticketsWonPerAddress[investmentId][randomAddress].add(1);

                counter -= 1;
            }
        }
    }

    /**
     * @notice Withdraw Investment Tickets
     * @dev This function is called by an investor to withdraw his tickets.
     * @dev require Settled state and enough tickets won
     * @param investmentId The id of the investment.
     * @param ticketsToLock The amount of won tickets to be locked, so as to get more rALBT.
     * @param ticketsToWithdraw The amount of won tickets to be withdrawn instantly.
    */
    function withdrawInvestmentTickets(uint256 investmentId, uint256 ticketsToLock, uint256 ticketsToWithdraw)
        external
    {
        require(loanStatus[investmentId] == LoanLibrary.LoanStatus.SETTLED, "Can withdraw only in Settled state");
        require(ticketsWonPerAddress[investmentId][msg.sender] > 0 &&
            ticketsWonPerAddress[investmentId][msg.sender] >= ticketsToLock.add(ticketsToWithdraw),
            "Not enough tickets won"
        );

        ticketsWonPerAddress[investmentId][msg.sender] = ticketsWonPerAddress[investmentId][msg.sender].sub(
            ticketsToLock).sub(ticketsToWithdraw);

        _updateReputationalBalanceForPreviouslyLockedTokens();

        if (ticketsToLock > 0) {
            lockedTicketsForSpecificInvestmentPerAddress[investmentId][msg.sender] =
                lockedTicketsForSpecificInvestmentPerAddress[investmentId][msg.sender].add(ticketsToLock);

            lockedTicketsPerAddress[msg.sender] = lockedTicketsPerAddress[msg.sender].add(ticketsToLock);
        }

        if (ticketsToWithdraw > 0) {
            uint256 amountToWithdraw = investmentTokensPerTicket[investmentId].mul(ticketsToWithdraw);
            escrow.transferCollateralToken(loanDetails[investmentId].collateralToken ,msg.sender, amountToWithdraw);
        }

        if (remainingTicketsPerAddress[investmentId][msg.sender] > 0) {
            _withdrawAmountProvidedForNonWonTickets(investmentId);
        }
    }

    /**
     * @dev This function is called by an investor to withdraw lending tokens provided for non-won tickets.
     * @param investmentId The id of the investment.
     */
    function withdrawAmountProvidedForNonWonTickets(uint256 investmentId)
        external
    {
        require(loanStatus[investmentId] == LoanLibrary.LoanStatus.SETTLED, "Can withdraw only in Settled state");
        require(remainingTicketsPerAddress[investmentId][msg.sender] > 0, "No non-won tickets to withdraw");

        _withdrawAmountProvidedForNonWonTickets(investmentId);
    }

    /**
     * @notice Withdraw locked investment ticket
     * @dev This function is called by an investor to withdraw his locked tickets.
     * @dev requires Settled state and available tickets
     * @param investmentId The id of the investment.
     * @param ticketsToWithdraw The amount of locked tickets to be withdrawn.
    */
    function withdrawLockedInvestmentTickets(uint256 investmentId, uint256 ticketsToWithdraw)
        external
    {
        require(loanStatus[investmentId] == LoanLibrary.LoanStatus.SETTLED, "Can withdraw only in Settled state");
        require(ticketsToWithdraw > 0 &&
            lockedTicketsForSpecificInvestmentPerAddress[investmentId][msg.sender] >= ticketsToWithdraw,
            "Not enough tickets to withdraw"
        );

        _updateReputationalBalanceForPreviouslyLockedTokens();

        lockedTicketsForSpecificInvestmentPerAddress[investmentId][msg.sender] =
            lockedTicketsForSpecificInvestmentPerAddress[investmentId][msg.sender].sub(ticketsToWithdraw);

        lockedTicketsPerAddress[msg.sender] = lockedTicketsPerAddress[msg.sender].sub(ticketsToWithdraw);

        uint256 amountToWithdraw = investmentTokensPerTicket[investmentId].mul(ticketsToWithdraw);
        escrow.transferCollateralToken(loanDetails[investmentId].collateralToken, msg.sender, amountToWithdraw);
    }

    /**
     * @notice Gets Requesting status
     * @dev Returns true if investors have shown interest for equal or more than the total tickets.
     * @param investmentId The id of the investment type to be checked.
    */
    function getRequestingInterestStatus(uint256 investmentId) external view returns (bool) {
        return loanDetails[investmentId].totalPartitions <= loanDetails[investmentId].partitionsPurchased;
    }

    /**
     * @notice Generates Random Number
     * @dev This function generates a random number
     * @param maxNumber the max number possible
     * @return randomNumber the random number generated
    */
     function getRandomNumber(uint256 maxNumber) internal view returns (uint256 randomNumber) {
        randomNumber = uint256(keccak256(abi.encodePacked(
                block.difficulty,
                block.timestamp,
                lotteryNonce,
                blockhash(block.number),
                msg.sender
            ))).mod(maxNumber);
    }

    /**
     * @notice Updates reputation balance
     * @dev updates balance of reputation for locked tokens
     * @return the reputation balance of msg.sender
    */
    function _updateReputationalBalanceForPreviouslyLockedTokens() internal returns (uint256) {
        if (lockedTicketsPerAddress[msg.sender] > 0) {
            uint256 amountOfReputationalAlbtPerTicket = (block.number.sub(
                lastBlockCheckedForLockedTicketsPerAddress[msg.sender])).div(blocksLockedForReputation);

            uint256 amountOfReputationalAlbtToMint = amountOfReputationalAlbtPerTicket.mul(
                lockedTicketsPerAddress[msg.sender]);

            if (amountOfReputationalAlbtToMint > 0)
                escrow.mintReputationalToken(msg.sender, amountOfReputationalAlbtToMint);

            lastBlockCheckedForLockedTicketsPerAddress[msg.sender] = block.number;
        }

        return rALBT.balanceOf(msg.sender);
    }

    function _withdrawAmountProvidedForNonWonTickets(uint256 investmentId_)
        internal
    {
        uint256 amountToReturnForNonWonTickets = remainingTicketsPerAddress[investmentId_][msg.sender].mul(
            baseAmountForEachPartition);
        remainingTicketsPerAddress[investmentId_][msg.sender] = 0;

        escrow.transferLendingToken(msg.sender, amountToReturnForNonWonTickets);
    }
}
