// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the Registry contract.
 */
interface IRegistry {
    function decideForInvestment(uint256 investmentId, bool decision) external;

    function getRequestingInterestStatus(uint256 investmentId) external view returns (bool);

    function startLotteryPhase(uint256 investmentId) external;
}
