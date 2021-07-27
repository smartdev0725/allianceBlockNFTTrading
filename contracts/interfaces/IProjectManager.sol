// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title AllianceBlock Project Manager contract
 * @dev Extends Initializable, OwnableUpgradeable
 */
interface IProjectManager {

    function createProject() external returns(uint256);

    function isProject(address projectAddress) external returns (bool);

    function getProjectTypeFromProjectId(uint256 id) external returns (uint256);

    function getProjectTypeIndexFromAddress(address project) external returns (uint256);

    function getProjectAddressFromType(uint256 id) external returns (address);

    function getProjectAddressFromProjectId(uint256 id) external returns (address);
    
}
