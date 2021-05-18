// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/GSN/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../utils/Strings.sol";
import "../libs/TokenFormat.sol";

/**
 * @title Alliance Block Funding NFTs
 * @notice NFTs that will be held by users
 */
contract FundingNFT is Initializable, ContextUpgradeable, AccessControlUpgradeable, ERC1155Upgradeable {
    using Counters for Counters.Counter;
    using TokenFormat for uint256;

    // Events
    event GenerationIncreased(
        uint256 indexed loanId,
        address indexed user,
        uint256 newGeneration
    );
    event GenerationDecreased(
        uint256 indexed loanId,
        address indexed user,
        uint256 newGeneration
    );
    event TransfersPaused(uint256 loanId);
    event TransfersResumed(uint256 loanId);

    // Keep track of loan Ids
    Counters.Counter private _loanIdTracker;

    // contract URI for marketplaces
    string private _contractURI;

    // base url for each token metadata. Concatenates with ipfsHash for full path
    string private _baseURI;

    // Mapping from loan ID to paused condition
    mapping(uint256 => bool) public transfersPaused;

    // Mapping from token ID to IPFS hash (token metadata)
    mapping(uint256 => string) public ipfsHashes;

    // Access Roles
    bytes32 public MINTER_ROLE;
    bytes32 public PAUSER_ROLE;

    /**
     * @dev Initializes the contract
     */
    function initialize(string memory baseUri, string memory contractUri) public initializer {
        MINTER_ROLE = keccak256("MINTER_ROLE");
        PAUSER_ROLE = keccak256("PAUSER_ROLE");
        __ERC1155_init("");
        __ERC1155_init_unchained("");
        _baseURI = baseUri;
        _contractURI = contractUri;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
    }

    modifier onlyPauser() {
        require(hasRole(PAUSER_ROLE, _msgSender()), "Must have pauser role");
        _;
    }

    modifier onlyMinter() {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "Must have minter role to mint"
        );
        _;
    }

    // /**
    // * @dev token metadata
    // */
    // function uri(uint tokenId) public view override returns(string memory){
    //     return Strings.strConcat(_baseURI, ipfsHashes[tokenId]);
    // }

    /**
     * @dev contract metadata
     */
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    /**
     * @dev Owner can pause transfers for specific tokens
     * @dev pauses all loan ids, no matter the generation
     */
    function pauseTokenTransfer(uint256 loanId) external onlyPauser {
        transfersPaused[loanId] = true;
        emit TransfersPaused(loanId);
    }

    /**
     * @dev Owner can unpause transfers for specific tokens
     */
    function unpauseTokenTransfer(uint256 loanId) external onlyPauser {
        transfersPaused[loanId] = false;
        emit TransfersResumed(loanId);
    }

    /**
     * @dev Format tokenId into generation and index
     */
    function getCurrentLoanId() public view returns (uint256 loanId) {
        return _loanIdTracker.current();
    }

    /**
     * @dev Mint generation 0 tokens
     */
    function mintGen0(address to, uint256 amount) external onlyMinter {
        uint256 tokenId = getCurrentLoanId();
        _mint(to, tokenId, amount, "");
        _loanIdTracker.increment();
    }

    /**
     * @dev Mint tokens of a specific generation directly
     * @param to The address to mint the tokens to.
     * @param amount The amount of tokens to mint.
     * @param generation The generation of the tokens. The id of the tokens will be composed of the loan id and this generation number.
     */
    function mintOfGen(
        address to,
        uint256 amount,
        uint256 generation
    ) external onlyMinter {
        uint256 tokenId = generation.getTokenId(getCurrentLoanId());
        _mint(to, tokenId, amount, "");
        _loanIdTracker.increment();
    }

    /**
     * @notice decrease generations of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     */
    function decreaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToDecrease
    ) external onlyMinter {
        _decreaseGenerations(tokenId, user, amount, generationsToDecrease);
    }

    /**
     * @notice increase generation of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     */
    function increaseGeneration(
        uint256 tokenId,
        address user,
        uint256 amount
    ) external onlyMinter {
        _increaseGenerations(tokenId, user, amount, 1);
    }

    /**
     * @notice increase generations of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     */
    function increaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToAdd
    ) external onlyMinter {
        _increaseGenerations(tokenId, user, amount, generationsToAdd);
    }

    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyMinter {
        _burn(account, id, amount);
    }

    /**
     * @notice increase multiple generations of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     */
    function _increaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToAdd
    ) internal {
        (uint256 generation, uint256 loanId) = tokenId.formatTokenId();

        // Increase generation, leave loanId same
        generation += generationsToAdd;
        uint256 newTokenId = generation.getTokenId(loanId);

        // Burn previous gen tokens
        burn(user, tokenId, amount);

        // Mint new generation tokens
        _mint(user, newTokenId, amount, "");

        emit GenerationIncreased(loanId, user, generation);
    }

    /**
     * @notice decrease multiple generations of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     */
    function _decreaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToDecrease
    ) internal {
        (uint256 generation, uint256 loanId) = tokenId.formatTokenId();

        require(generation >= generationsToDecrease, "Invalid token ID");

        // Decrease generation, leave loanId same
        generation -= generationsToDecrease;
        uint256 newTokenId = generation.getTokenId(loanId);

        // Burn previous gen tokens
        burn(user, tokenId, amount);

        // Mint new generation tokens
        _mint(user, newTokenId, amount, "");

        emit GenerationDecreased(loanId, user, generation);
    }

    /**
     * @dev Validates if the loanId from the tokenId can be transferred
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        for (uint256 i = 0; i < ids.length; i++) {
            (, uint256 loanId) = ids[i].formatTokenId();
            require(!transfersPaused[loanId], "Transfers paused");
        }
    }
}
