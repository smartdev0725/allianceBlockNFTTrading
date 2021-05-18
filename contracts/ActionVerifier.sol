// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
pragma experimental ABIEncoderV2;

import "./libs/SignatureVerifier.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IEscrow.sol";

contract ActionVerifier is Ownable {
    using SafeMath for uint256;
    using SignatureVerifier for SignatureVerifier.Action;

    mapping(bytes32 => uint256) public rewardPerAction;
    uint256 public rewardPerActionProvision;
    uint256 public maxActionsPerProvision;

    IEscrow public escrow;

    /**
     * @dev Constructor of the ActionVerifier contract.
     * @param rewardPerActionProvision_ The reward that an action provider accumulates for each action provision.
     */
    constructor(
        address escrow_,
        uint256 rewardPerActionProvision_,
        uint256 maxActionsPerProvision_
    ) public {
        escrow = IEscrow(escrow_);
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
     * @dev This function is used by users to provide rewards to all users for their actions.
     * @param actions The actions provided.
     * @param signatures The signatures representing the actions.
     */
    function provideRewardsForActions(
        SignatureVerifier.Action[] memory actions,
        bytes[] memory signatures
    )
        external
        onlyOwner()
    {
        require(actions.length == signatures.length, "Invalid length");
        // TODO - Rachid specifies the require to add here.

        address[] memory accounts = new address[](actions.length.add(1));
        uint256[] memory rewards = new uint256[](actions.length.add(1));

        uint256 rewardForCaller;

        for (uint256 i = 0; i < actions.length; i++) {
            if (
                actions[i].isValidSignature(signatures[i]) &&
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
}
