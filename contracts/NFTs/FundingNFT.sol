// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/GSN/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "../utils/Strings.sol";
import "../libs/TokenFormat.sol";

/**
 * @title Alliance Block Funding NFTs
 * @notice NFTs that will be held by users
 * @dev Extends Initializable, ContextUpgradeable, AccessControlUpgradeable, ERC1155Upgradeable
 */
contract FundingNFT is Initializable, ContextUpgradeable, AccessControlUpgradeable, ERC1155Upgradeable {
    using TokenFormat for uint256;

    // Events
    event GenerationIncreased(uint256 indexed loanId, address indexed user, uint256 newGeneration);
    event GenerationDecreased(uint256 indexed loanId, address indexed user, uint256 newGeneration);
    event TransfersPaused(uint256 loanId);
    event TransfersResumed(uint256 loanId);

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
     * @notice Initializes the contract
     * @param baseUri sets the base URI
     * @param contractUri sets the contract URI
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
        require(hasRole(MINTER_ROLE, _msgSender()), "Must have minter role to mint");
        _;
    }

    // /**
    // * @dev token metadata
    // */
    // function uri(uint tokenId) public view override returns(string memory){
    //     return Strings.strConcat(_baseURI, ipfsHashes[tokenId]);
    // }

    /**
     * @notice contract metadata
     * @return the contractURI stored in memory
     */
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    /**
     * @notice Pauses the token transfers
     * @dev Owner can pause transfers for specific tokens
     * @dev pauses all loan ids, no matter the generation
     * @param loanId the loan ID to be paused
     */
    function pauseTokenTransfer(uint256 loanId) external onlyPauser {
        transfersPaused[loanId] = true;
        emit TransfersPaused(loanId);
    }

    /**
     * @notice Unpauses the token transfers
     * @dev Owner can unpause transfers for specific tokens
     * @param loanId the loan ID to be unpaused
     */
    function unpauseTokenTransfer(uint256 loanId) external onlyPauser {
        transfersPaused[loanId] = false;
        emit TransfersResumed(loanId);
    }

    /**
     * @notice Mint generation 0 tokens
     * @param to the target address that will receive the Gen0 tokens
     * @param amount the amount of tokens to mint
     * @param loanId the ID of the loan
     */
    function mintGen0(
        address to,
        uint256 amount,
        uint256 loanId
    ) external onlyMinter {
        // LoanId is the tokenId used to mint
        _mint(to, loanId, amount, "");
    }

    /**
     * @notice Mint tokens of a specific generation directly
     * @param to The address to mint the tokens to.
     * @param amount The amount of tokens to mint.
     * @param generation The generation of the tokens. The id of the tokens will be composed of the loan id and this generation number.
     * @param loanId The loan identifier
     */
    function mintOfGen(
        address to,
        uint256 amount,
        uint256 generation,
        uint256 loanId
    ) external onlyMinter {
        uint256 tokenId = generation.getTokenId(loanId);
        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Decrease generations of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     * @param tokenId the ID of the token to decrease generations
     * @param user the owner of the tokens
     * @param amount the number of tokens to change
     * @param generationsToDecrease the number of generations to decrease
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
     * @param tokenId the ID of the token to increase a single generation
     * @param user the owner of the tokens
     * @param amount the number of tokens to increase a single generation
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
     * @param tokenId the ID of the token to increase generations
     * @param user the owner of the tokens
     * @param amount the number of tokens to increase generations
     * @param generationsToAdd the number of generations to increase
     */
    function increaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToAdd
    ) external onlyMinter {
        _increaseGenerations(tokenId, user, amount, generationsToAdd);
    }

    /**
     * @notice Burns tokens
     * @param account the owner of the tokens
     * @param id id of the token
     * @param amount the number of tokens to burn
     */
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
     * @param tokenId the ID of the token to increase generations
     * @param user the owner of the tokens
     * @param amount the number of tokens to increase generations
     * @param generationsToAdd the number of generations to increase
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
     * @param tokenId the ID of the token to decrease generations
     * @param user the owner of the tokens
     * @param amount the number of tokens to decrease  Generations
     * @param generationsToDecrease the number of generations to decrease
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
     * @notice Runs checks before transferring a token
     * @dev Validates if the loanId from the tokenId can be transferred and not paused
     * @param operator TBD
     * @param from TBD
     * @param to TBD
     * @param ids array of ids
     * @param amounts array of amounts
     * @param data TBD
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
