// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title AllianceBlock Project Manager contract
 * @dev Extends Initializable, OwnableUpgradeable
 */
interface IProjectManager {

    function createProject() external returns(uint256);

    function isProject(address projectAddress) external returns (bool);

    function totalProjects() view external returns (uint256);
    
    function totalProjectTypes() view external returns (uint256);

    function projectTypeFromProjectId(uint256 id) external returns (uint256);

    function projectTypeIndexFromAddress(address project) external returns (uint256);

    function projectAddressFromType(uint256 id) external returns (address);

    function projectAddressFromProjectId(uint256 id) external returns (address);
    
}
