// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libs/ProjectLibrary.sol";

/**
 * @title Interface of the Investment contract.
 */
interface IProject {
    function decideForProject(uint256 projectId, bool decision) external;

    function getRequestingInterestStatus(uint256 projectId) external view returns (bool);

    function startLotteryPhase(uint256 projectId) external;

    function setEscrowAddress(address escrowAddress_) external;

    function addLendingToken(address lendingToken_) external;

    function projectStatus(uint256 projectId) external returns (ProjectLibrary.ProjectStatus);

}
