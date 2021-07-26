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
contract Storage {
    // The amount of investment tokens each ticket contains.
    mapping(uint256 => uint256) public investmentTokensPerTicket;
    // The amount of tickets remaining to be allocated to investors.
    mapping(uint256 => uint256) public ticketsRemaining;
    // The number lottery numbers allocated from all investors for a specific investment.
    mapping(uint256 => uint256) public totalLotteryNumbersPerInvestment;
    // The address of the investor that has allocated a specific lottery number on a specific investment.
    mapping(uint256 => mapping(uint256 => address)) public addressOfLotteryNumber;
    // The amount of tickets that an investor requested that are still not allocated.
    mapping(uint256 => mapping(address => uint256)) public remainingTicketsPerAddress;
    // The amount of tickets that an investor requested that have been won already.
    mapping(uint256 => mapping(address => uint256)) public ticketsWonPerAddress;
    // The amount of tickets that an investor locked for a specific investment.
    mapping(uint256 => mapping(address => uint256)) public lockedTicketsForSpecificInvestmentPerAddress;
    // The amount of tickets that an investor locked from all investments.
    mapping(address => uint256) public lockedTicketsPerAddress;
    // The last block checked for rewards for the tickets locked per address.
    mapping(address => uint256) public lastBlockCheckedForLockedTicketsPerAddress;

    // This variable represents the base amount in which every investment amount is divided to. (also the starting value for each ERC1155)
    uint256 public baseAmountForEachPartition;
    // The amount of tickets to be provided by each run of the lottery.
    uint256 public totalTicketsPerRun;
    // The amount of rALBT needed to allocate one lottery number.
    uint256 public rAlbtPerLotteryNumber;
    // The amount of blocks needed for a ticket to be locked, so as the investor to get 1 rALBT.
    uint256 public blocksLockedForReputation;
    // The amount of lottery numbers, that if investor has after number allocation he gets one ticket without lottery.
    uint256 public lotteryNumbersForImmediateTicket;
    // The nonce for the lottery numbers.
    uint256 internal lotteryNonce;
}
