// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title AllianceBlock Project Manager contract
 * @dev Extends Initializable, OwnableUpgradeable
 */
interface IProjectManager {

    /**
     * @notice Function to create a new project.
     * @dev Must be called from a valid project type contract.
     */
    function createProject() external returns(uint256);

    /**
     * @notice Function to know if an address is a valid project type contract.
     * @param projectAddress address to verify.
     */
    function isProject(address projectAddress) external returns (bool);

    /** 
     * @notice Get the quantity of total projects created.
     */
    function totalProjects() view external returns (uint256);

    /** 
     * @notice Get project type number from a project Id.
     * @param projectId the projectId to search.
     */
    function projectTypeFromProjectId(uint256 projectId) external returns (uint256);

    /** 
     * @notice Get project type number from a project address.
     * @param projectAddress the project address to get the type number.
     */
    function projectTypeIndexFromAddress(address projectAddress) external returns (uint256);

    /** 
     * @notice Get project address from a project type number.
     * @param typeNumber the project type number to search.
     */
    function projectAddressFromType(uint256 typeNumber) external returns (address);

    /** 
     * @notice Get project address from a projectId.
     * @param projectId the projectId to search.
     */
    function projectAddressFromProjectId(uint256 projectId) external returns (address);
    
}
