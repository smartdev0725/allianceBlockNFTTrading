// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title AllianceBlock Project Manager contract
 * @dev Extends Initializable, OwnableUpgradeable
 */
contract ProjectManager is Initializable, OwnableUpgradeable {
    using SafeMath for uint256;

    uint256 public totalProjects;
    uint256 public totalProjectTypes;
    // mapping of the projectId to a project type
    mapping(uint256 => uint256) public projectTypeFromProjectId;
    // mapping of the project type to a project address
    mapping(address => uint256) public projectTypeIndexFromAddress;
    // mapping of the project type to a project address
    mapping(uint256 => address) public projectAddressFromType;
    // mapping of the project type to a project address
    mapping(uint256 => address) public projectAddressFromProjectId;

    modifier onlyProject() {
        require(projectTypeIndexFromAddress[msg.sender] != 0, "Only Project contract");
        _;
    }

    /**
     * @notice Initialize the contract.
     */
    function initialize() external initializer {
        __Ownable_init();
        totalProjects = 0;
        totalProjectTypes = 1;
    }

    function getTotalProjects() view external returns (uint256){
        return totalProjects;
    }

    function getTotalProjectTypes() view external returns (uint256){
        return totalProjectTypes;
    }

    function getProjectTypeFromProjectId(uint256 id) view external returns (uint256){
        return projectTypeFromProjectId[id];
    }

    function getProjectTypeIndexFromAddress(address project) view external returns (uint256){
        return projectTypeIndexFromAddress[project];
    }

    function getProjectAddressFromType(uint256 id) view external returns (address){
        return projectAddressFromType[id];
    }

    function getProjectAddressFromProjectId(uint256 id) view external returns (address){
        return projectAddressFromProjectId[id];
    }

    function isProject(address projectAddress) view external returns (bool){
        return projectTypeIndexFromAddress[projectAddress] != 0;
    }

    function createProject() external onlyProject() returns(uint256){
        projectTypeFromProjectId[totalProjects] = projectTypeIndexFromAddress[msg.sender];
        projectAddressFromProjectId[totalProjects] = msg.sender;
        totalProjects += 1;
        return totalProjects-1;
    }

    function createProjectType(address projectAddress) external onlyOwner(){
        projectTypeIndexFromAddress[projectAddress] = totalProjectTypes;
        projectAddressFromType[totalProjectTypes] = projectAddress;
        totalProjectTypes += 1;
    }

}
