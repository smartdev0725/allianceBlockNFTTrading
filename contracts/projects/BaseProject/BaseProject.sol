// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./BaseProjectStorage.sol";
import "../../libs/TokenFormat.sol";
import "../../interfaces/IProjectManager.sol";

/**
 * @title AllianceBlock BaseProject contract
 * @notice Common functionality for all type of projects.
 * @dev Extends BaseProjectStorage
 */
contract BaseProject is BaseProjectStorage, OwnableUpgradeable {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // EVENTS
    event ProjectStarted(uint256 indexed projectId);
    event ProjectApproved(uint256 indexed projectId);
    event ProjectRejected(uint256 indexed projectId);
    event ProjectRequested(uint256 indexed projectId, address indexed user, uint256 amount);
    event ProjectInterest(uint256 indexed projectId, uint amount);
    event ProjectSettled(uint256 indexed projectId);

    modifier onlyGovernance() {
        require(msg.sender == address(governance), "Only Governance");
        _;
    }

    function __BaseProject_init() public{
        __Ownable_init();
    }

    /**
     * @notice Update escrow address
     * @dev This function is called by the owner to update the escrow address
     * @param escrowAddress_ The address of escrow that will be updated.
     */
    function setEscrowAddress(
        address escrowAddress_
    ) external onlyOwner() {
        require(escrowAddress_ != address(0), "Cannot provide escrowAddress_ with 0 address");
        escrow = IEscrow(escrowAddress_);
    }

    /**
     * @notice Add lending token
     * @dev This function is called by the owner to add another lending token.
     * @param lendingToken_ The address of lending token that will be added.
     */
    function addLendingToken(
        address lendingToken_
    ) external onlyOwner() {
        require(lendingToken_ != address(0), "Cannot provide lendingToken_ with 0 address");
        require(!isValidLendingToken[lendingToken_], "Cannot add existing lending token");
        isValidLendingToken[lendingToken_] = true;
    }

}
