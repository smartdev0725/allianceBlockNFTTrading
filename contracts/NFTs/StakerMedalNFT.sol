// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

/**
 * @title Alliance Block StakerMedalNFT
 * @notice NFTs that will be held by users as a Medals
 * @dev Extends Initializable, ERC1155Upgradeable
 */
contract StakerMedalNFT is Initializable, AccessControlUpgradeable, ERC1155Upgradeable {
    // STAKER_LVL_0 is not a staker
    enum StakingType {STAKER_LVL_0, STAKER_LVL_1, STAKER_LVL_2, STAKER_LVL_3}

    // Access Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "Must have minter role to mint");
        _;
    }

    modifier onlyAllowedStakingType(uint256 stakingId) {
        require(stakingId >= 1 && stakingId <= 3, "Staking ID not allowed, must be 1, 2 or 3");
        _;
    }

    /**
     * @notice Initializes the contract
     */
    function initialize() external initializer {
        __ERC1155_init("");
        __AccessControl_init();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
    }

    /**
     * @notice Mint tokens
     * @param to The address to mint the tokens to.
     * @param stakingId The medal identifier
     */
    function mint(address to, uint256 stakingId) public onlyMinter() onlyAllowedStakingType(stakingId) {
        _mint(to, stakingId, 1, "");
    }

    /**
     * @notice Burns tokens
     * @param account the owner of the tokens
     * @param stakingId The medal identifier
     */
    function burn(address account, uint256 stakingId) public onlyMinter() onlyAllowedStakingType(stakingId) {
        _burn(account, stakingId, 1);
    }

    /**
        @notice Transfers `_value` amount of an `_id` from the `_from` address to the `_to` address specified (with safety call).
        @dev Method disabled
        MUST revert Method disabled.
        @param _from    Source address
        @param _to      Target address
        @param _id      ID of the token type
        @param _value   Transfer amount
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
    */
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) public override {
        revert("Method safeTransferFrom disabled");
    }

    /**
        @notice Transfers `_values` amount(s) of `_ids` from the `_from` address to the `_to` address specified (with safety call).
        @dev Method disabled
        MUST revert Method disabled
        @param _from    Source address
        @param _to      Target address
        @param _ids     IDs of each token type (order and length must match _values array)
        @param _values  Transfer amounts per token type (order and length must match _ids array)
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`
    */
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) public override {
        revert("Method safeBatchTransferFrom disabled");
    }

    /**
        @notice Get the level of some staker address
        @param account  Staker address
        @return level of the staker, 1, 2 or 3. 0 if nothing
    */
    function getLevelOfStaker(address account) external view returns (uint256) {
        require(account != address(0), "Account is a zero address");

        uint256 balanceOfStakerMedalGold = balanceOf(account, uint(StakingType.STAKER_LVL_3));
        if(balanceOfStakerMedalGold == 1) {
            return uint(StakingType.STAKER_LVL_3);
        }

        uint256 balanceOfStakerMedalSilver = balanceOf(account, uint(StakingType.STAKER_LVL_2));
        if(balanceOfStakerMedalSilver == 1) {
            return uint(StakingType.STAKER_LVL_2);
        }

        uint256 balanceOfStakerMedalBronce = balanceOf(account, uint(StakingType.STAKER_LVL_1));
        if(balanceOfStakerMedalBronce == 1) {
            return uint(StakingType.STAKER_LVL_1);
        }

        return uint(StakingType.STAKER_LVL_0);
    }
}
