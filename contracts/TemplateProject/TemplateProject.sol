// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ProjectStorage.sol";
import "../libs/TokenFormat.sol";

/**
 * @title AllianceBlock InvestmentDetails contract
 * @notice Functionality for storing investment details and modifiers.
 * @dev Extends Storage
 */
contract TemplateProject is ProjectStorage, OwnableUpgradeable {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    modifier onlyGovernance() {
        require(msg.sender == address(governance), "Only Governance");
        _;
    }

    function __TemplateProject_init() public{
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
