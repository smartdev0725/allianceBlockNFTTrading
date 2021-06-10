// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./libs/SignatureVerifier.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IEscrow.sol";
import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "hardhat/console.sol";

/**
 * @title AllianceBlock ActionVerifier contract
 * @dev Extends Initializable, OwnableUpgradeable
 * @notice Handles user's Actions and Rewards within the protocol
 */
 contract ActionVerifier is Initializable, OwnableUpgradeable {
    using SafeMath for uint256;
    using SignatureVerifier for SignatureVerifier.Action;

    mapping(bytes32 => uint256) public rewardPerAction;
    uint256 public rewardPerActionProvision;
    uint256 public maxActionsPerProvision;

    IEscrow public escrow;
    IStaking public staking;

    bytes32 public DOMAIN_SEPARATOR;

    bytes32 public constant EIP712DOMAIN_TYPEHASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    /**
     * @dev Initializer of the ActionVerifier contract.
     * @param rewardPerActionProvision_ The reward that an action provider accumulates for each action provision.
     * @param maxActionsPerProvision_ The max actions that an account can take rewards for in one function call.
     * @param escrow_ The address of the escrow.
     */
    function initialize(
        uint256 rewardPerActionProvision_,
        uint256 maxActionsPerProvision_,
        address escrow_,
        address staking_,
        uint256 chainId
    ) public initializer {
        __Ownable_init();
        escrow = IEscrow(escrow_);
        staking = IStaking(staking_);
        rewardPerActionProvision = rewardPerActionProvision_;
        maxActionsPerProvision = maxActionsPerProvision_;

        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: "AllianceBlock Verifier",
            version: '1.0',
            chainId: chainId,
            verifyingContract: address(this)
        }));
    }

    function hash(EIP712Domain memory eip712Domain) internal view returns (bytes32) {
        return keccak256(abi.encode(
            EIP712DOMAIN_TYPEHASH,
            keccak256(bytes(eip712Domain.name)),
            keccak256(bytes(eip712Domain.version)),
            eip712Domain.chainId,
            eip712Domain.verifyingContract
        ));
    }

    /**
     * @dev This function is used by the owner to update variables.
     * @param rewardPerActionProvision_ The reward that an action provider accumulates for each action provision.
     * @param maxActionsPerProvision_ The max actions that an account can take rewards for in one function call.
     */
    function updateVariables(uint256 rewardPerActionProvision_, uint256 maxActionsPerProvision_)
        external
        onlyOwner()
    {
        rewardPerActionProvision = rewardPerActionProvision_;
        maxActionsPerProvision = maxActionsPerProvision_;
    }

    /**
     * @dev This function is used by the owner to add more actions.
     * @param action The name of the action.
     * @param reputationalAlbtReward The reputational albt reward for this action.
     */
    function importAction(string memory action, uint256 reputationalAlbtReward)
        external
        onlyOwner()
    {
        rewardPerAction[keccak256(abi.encodePacked(action))] = reputationalAlbtReward;
    }

    /**
     * @dev This function is used by the owner to update actions.
     * @param action The name of the action.
     * @param reputationalAlbtReward The reputational albt reward for this action.
     */
    function updateAction(string memory action, uint256 reputationalAlbtReward)
        external
        onlyOwner()
    {
        require(rewardPerAction[keccak256(abi.encodePacked(action))] > 0, "Action should already exist");
        rewardPerAction[keccak256(abi.encodePacked(action))] = reputationalAlbtReward;
    }

    /**
     * @dev This function is used by users to provide rewards to all users for their actions.
     * @param actions The actions provided.
     * @param signatures The signatures representing the actions.
     */
    function provideRewardsForActions(
        SignatureVerifier.Action[] memory actions,
        bytes[] memory signatures
    )
        external
    {
        require(staking.getEligibilityForActionProvision(msg.sender), "Must be at least lvl2 staker");
        require(actions.length == signatures.length, "Invalid length");
        require(actions.length <= maxActionsPerProvision, "Too many actions");

        address[] memory accounts = new address[](actions.length.add(1));
        uint256[] memory rewards = new uint256[](actions.length.add(1));

        uint256 rewardForCaller;

        for (uint256 i = 0; i < actions.length; i++) {
            if (
                actions[i].isValidSignature(signatures[i], DOMAIN_SEPARATOR) &&
                rewardPerAction[keccak256(abi.encodePacked(actions[i].actionName))] > 0
            )
            {
                accounts[i] = actions[i].account;
                rewards[i] = rewardPerAction[keccak256(abi.encodePacked(actions[i].actionName))];

                rewardForCaller = rewardForCaller.add(rewardPerActionProvision);
            }
            else {
                accounts[i] = address(0);
                rewards[i] = 0;
            }
        }

        accounts[actions.length] = msg.sender;
        rewards[actions.length] = rewardForCaller;

        escrow.multiMintReputationalToken(accounts, rewards);
    }

    /**
     * @notice Check Action
     * @dev checks if given action has a reward
     * @return exist boolean represents checks if action has a reward associated
    */
    function checkAction(string memory action) public view returns (bool exist){
         return rewardPerAction[keccak256(abi.encodePacked(action))] > 0;
    }
}
