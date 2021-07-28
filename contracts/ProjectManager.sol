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

    uint256 projectCont;
    uint256 projectTypeCont;
    // mapping of the projectId to a project type
    mapping(uint256 => uint256) projectTypeFromProjectId;
    // mapping of the project type to a project address
    mapping(address => uint256) projectTypeIndexFromAddress;
    // mapping of the project type to a project address
    mapping(uint256 => address) projectAddressFromType;
    // mapping of the project type to a project address
    mapping(uint256 => address) projectAddressFromProjectId;

    modifier onlyProject() {
        require(projectTypeIndexFromAddress[msg.sender] != 0, "Only Project contract");
        _;
    }

    /**
     * @notice Initialize the contract.
     */
    function initialize() external initializer {
        __Ownable_init();
        projectCont = 1;
        projectTypeCont = 1;
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
        projectTypeFromProjectId[projectCont] = projectTypeIndexFromAddress[msg.sender];
        projectAddressFromProjectId[projectCont] = msg.sender;
        projectCont += 1;
        return projectCont-1;
        //INVERTIR LUEGO
    }

    function createProjectType(address projectAddress) external onlyOwner(){
        projectTypeIndexFromAddress[projectAddress] = projectTypeCont;
        projectAddressFromType[projectTypeCont] = projectAddress;
        projectTypeCont += 1;
    }

}
