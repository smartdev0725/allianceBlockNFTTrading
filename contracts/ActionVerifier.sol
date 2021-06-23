// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./libs/SignatureVerifier.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IEscrow.sol";
import "./interfaces/IStakerMedalNFT.sol";
import "./interfaces/IReferralContract.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title AllianceBlock ActionVerifier contract
 * @dev Extends Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable
 * @notice Handles user's Actions and Rewards within the protocol
 */
contract ActionVerifier is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using SignatureVerifier for SignatureVerifier.Action;

    mapping(bytes32 => mapping(uint256 => uint256)) public rewardPerActionPerLevel;
    mapping(bytes32 => mapping(uint256 => uint256)) public rewardPerActionPerLevelAfterFirstTime;
    mapping(bytes32 => uint256) public minimumLevelForActionProvision;
    mapping(bytes32 => IReferralContract) public referralContract;
    mapping(uint256 => uint256) public rewardPerActionProvisionPerLevel;
    mapping(uint256 => uint256) public maxActionsPerDayPerLevel;

    mapping(address => mapping(uint256 => uint256)) public actionsProvidedPerAccountPerEpoch;
    mapping(address => mapping(bytes32 => uint256)) public lastEpochActionDonePerAccount;

    uint256 currentEpoch;
    uint256 endingTimestampForCurrentEpoch;

    uint256 constant private ONE_DAY = 1 days;

    IEscrow public escrow;
    IStakerMedalNFT public stakerMedalNft;

    bytes32 public DOMAIN_SEPARATOR;

    bytes32 public constant EIP712DOMAIN_TYPEHASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    modifier checkEpoch() {
        while (block.timestamp >= endingTimestampForCurrentEpoch){
            currentEpoch = currentEpoch.add(1);
            endingTimestampForCurrentEpoch = endingTimestampForCurrentEpoch.add(ONE_DAY);
        }
        _;
    }

    /**
     * @dev Initializer of the ActionVerifier contract.
     * @param rewardsPerActionProvisionPerLevel_ The reward that an action provider accumulates for each action provision per level.
     * @param maxActionsPerDayPerLevel_ The max actions that an account can take rewards for in one day.
     * @param escrow_ The address of the escrow.
     * @param stakerMedalNft_ The address of the stakerMedalNft.
     * @param chainId The chain id.
     */
    function initialize(
        uint256[4] memory rewardsPerActionProvisionPerLevel_,
        uint256[4] memory maxActionsPerDayPerLevel_,
        address escrow_,
        address stakerMedalNft_,
        uint256 chainId
    ) external initializer {
        require(rewardsPerActionProvisionPerLevel_[3] != 0, "Cannot initialize rewardPerActionProvisionPerLevel_ with 0");
        require(maxActionsPerDayPerLevel_[3] != 0, "Cannot initialize maxActionsPerDayPerLevel_ with 0");
        require(escrow_ != address(0), "Cannot initialize with escrow_ address");
        require(stakerMedalNft_ != address(0), "Cannot initialize with stakerMedalNft_ address");
        require(chainId != 0, "Cannot initialize chainId with 0");

        __Ownable_init();
        __ReentrancyGuard_init();

        escrow = IEscrow(escrow_);
        stakerMedalNft = IStakerMedalNFT(stakerMedalNft_);

        for (uint256 i = 0; i < 4; i++) {
            rewardPerActionProvisionPerLevel[i] = rewardsPerActionProvisionPerLevel_[i];
            maxActionsPerDayPerLevel[i] = maxActionsPerDayPerLevel_[i];
        }

        DOMAIN_SEPARATOR = hash(
            EIP712Domain({
                name: "AllianceBlock Verifier",
                version: "1.0",
                chainId: chainId,
                verifyingContract: address(this)
            })
        );

        currentEpoch = 1;
        endingTimestampForCurrentEpoch = block.timestamp.add(ONE_DAY);
    }

    function hash(EIP712Domain memory eip712Domain) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712DOMAIN_TYPEHASH,
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.chainId,
                    eip712Domain.verifyingContract
                )
            );
    }

    /**
     * @dev This function is used by the owner to update variables.
     * @param rewardsPerActionProvisionPerLevel_ The reward that an action provider accumulates for each action provision per level.
     * @param maxActionsPerDayPerLevel_ The max actions that an account can take rewards for in one day.
     */
    function updateVariables(
        uint256[4] memory rewardsPerActionProvisionPerLevel_,
        uint256[4] memory maxActionsPerDayPerLevel_
    ) external onlyOwner() checkEpoch() {
        for (uint256 i = 0; i < 4; i++) {
            rewardPerActionProvisionPerLevel[i] = rewardsPerActionProvisionPerLevel_[i];
            maxActionsPerDayPerLevel[i] = maxActionsPerDayPerLevel_[i];
        }
    }

    /**
     * @dev This function is used by the owner to add more actions.
     * @param action The name of the action.
     * @param reputationalAlbtRewardsPerLevel The reputational albt reward for this action per staker level.
     * @param reputationalAlbtRewardsPerLevelAfterFirstTime The reputational albt reward for this action per staker level after first time.
     * @param minimumLevelForProvision The minimum staker level to be able to provide rewards for this action.
     * @param referralContract_ The referral contract if any for this action.
     */
    function importAction(
        string memory action,
        uint256[4] memory reputationalAlbtRewardsPerLevel,
        uint256[4] memory reputationalAlbtRewardsPerLevelAfterFirstTime,
        uint256 minimumLevelForProvision,
        address referralContract_
    ) external onlyOwner() checkEpoch() {
        _storeAction(
            action,
            reputationalAlbtRewardsPerLevel,
            reputationalAlbtRewardsPerLevelAfterFirstTime,
            minimumLevelForProvision,
            referralContract_
        );
    }

    /**
     * @dev This function is used by the owner to update already existing actions.
     * @param action The name of the action.
     * @param reputationalAlbtRewardsPerLevel The reputational albt reward for this action per staker level.
     * @param reputationalAlbtRewardsPerLevelAfterFirstTime The reputational albt reward for this action per staker level after first time.
     * @param minimumLevelForProvision The minimum staker level to be able to provide rewards for this action.
     * @param referralContract_ The referral contract if any for this action.
     */
    function updateAction(
        string memory action,
        uint256[4] memory reputationalAlbtRewardsPerLevel,
        uint256[4] memory reputationalAlbtRewardsPerLevelAfterFirstTime,
        uint256 minimumLevelForProvision,
        address referralContract_
    ) external onlyOwner() checkEpoch() {
        // If action exists it will for sure provide rewards to level 3 stakers.
        require(rewardPerActionPerLevel[keccak256(abi.encodePacked(action))][3] > 0, "Action should already exist");

        _storeAction(
            action,
            reputationalAlbtRewardsPerLevel,
            reputationalAlbtRewardsPerLevelAfterFirstTime,
            minimumLevelForProvision,
            referralContract_
        );
    }

    /**
     * @dev This function is used by users to provide rewards to all users for their actions.
     * @param actions The actions provided.
     * @param signatures The signatures representing the actions.
     */
    function provideRewardsForActions(SignatureVerifier.Action[] memory actions, bytes[] memory signatures) external nonReentrant() checkEpoch() {
        uint256 stakingLevel = stakerMedalNft.getLevelOfStaker(msg.sender);
        require(rewardPerActionProvisionPerLevel[stakingLevel] > 0,
            "Staking level not enough to provide rewards for actions");
        require(actions.length == signatures.length, "Invalid length");

        uint256 actionsRemainingForCurrentEpoch = maxActionsPerDayPerLevel[stakingLevel].sub(
            actionsProvidedPerAccountPerEpoch[msg.sender][currentEpoch]);

        require(actions.length <= actionsRemainingForCurrentEpoch, "Too many actions");

        address[] memory accounts = new address[](actions.length.add(1));
        uint256[] memory rewards = new uint256[](actions.length.add(1));

        uint256 rewardForCaller = 0;

        for (uint256 i = 0; i < actions.length; i++) {
            (bool isValid, uint256 reward) = _checkValidActionProvision(actions[i], signatures[i], stakingLevel);
            if (isValid) {
                accounts[i] = actions[i].account;
                rewards[i] = reward;

                rewardForCaller = rewardForCaller.add(rewardPerActionProvisionPerLevel[stakingLevel]);
                actionsProvidedPerAccountPerEpoch[msg.sender][currentEpoch] = 
                    actionsProvidedPerAccountPerEpoch[msg.sender][currentEpoch].add(1);
            } else {
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
     * @dev checks if given action has a reward for specific level
     * @return exist boolean represents checks if action has a reward associated
     */
    function checkAction(string memory action, uint256 stakingLevel) public view returns (bool exist) {        
        return rewardPerActionPerLevel[keccak256(abi.encodePacked(action))][stakingLevel] > 0;
    }

    function _checkValidActionProvision(
        SignatureVerifier.Action memory action,
        bytes memory signature,
        uint256 stakingLevelOfProvider
    ) internal returns (bool, uint256) {
        uint256 stakingLevelOfActionAccount = stakerMedalNft.getLevelOfStaker(action.account);
        bytes32 actionHash = keccak256(abi.encodePacked(action.actionName));

        bool isValidReferralId = true;
        bytes32 specificActionHash = actionHash;

        uint256 rewardForAction = rewardPerActionPerLevel[actionHash][stakingLevelOfActionAccount];

        if (address(referralContract[actionHash]) != address(0)) {
            isValidReferralId = referralContract[actionHash].isValidReferralId(action.referralId);
            specificActionHash = keccak256(abi.encodePacked(action.actionName, action.referralId));
        }       

        if (lastEpochActionDonePerAccount[action.account][specificActionHash] != 0) {
            if (rewardPerActionPerLevelAfterFirstTime[actionHash][stakingLevelOfActionAccount] == 0 ||
                currentEpoch == lastEpochActionDonePerAccount[action.account][specificActionHash])
            {
                return (false, 0);
            } else {
                rewardForAction = rewardPerActionPerLevelAfterFirstTime[actionHash][stakingLevelOfActionAccount];
            }
        }

        if (action.isValidSignature(signature, DOMAIN_SEPARATOR) &&
            minimumLevelForActionProvision[actionHash] <= stakingLevelOfProvider &&
            rewardForAction != 0 && isValidReferralId)
        {
            lastEpochActionDonePerAccount[action.account][specificActionHash] = currentEpoch;
            return (true, rewardForAction);
        }

        return (false, 0);
    }

    function _storeAction(
        string memory action,
        uint256[4] memory reputationalAlbtRewardsPerLevel,
        uint256[4] memory reputationalAlbtRewardsPerLevelAfterFirstTime,
        uint256 minimumLevelForProvision,
        address referralContract_
    ) internal {        
        bytes32 actionHash = keccak256(abi.encodePacked(action));
        for (uint256 i = 0; i < 4; i++) {
            rewardPerActionPerLevel[actionHash][i] = reputationalAlbtRewardsPerLevel[i];
            rewardPerActionPerLevelAfterFirstTime[actionHash][i] = reputationalAlbtRewardsPerLevelAfterFirstTime[i];
        }

        minimumLevelForActionProvision[actionHash] = minimumLevelForProvision;
        referralContract[actionHash] = IReferralContract(referralContract_);
    }
}
