// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the Investment contract.
 */
interface IProject {
    function decideForProject(uint256 projectId, bool decision) external;

    function getRequestingInterestStatus(uint256 projectId) external view returns (bool);

    function startLotteryPhase(uint256 projectId) external;

    function setEscrowAddress(address escrowAddress_) external;
    
    function addLendingToken(address lendingToken_) external;
}
