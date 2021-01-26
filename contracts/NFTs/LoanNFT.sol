// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../utils/Strings.sol";

/**
 * @title Alliance Block Loan NFTs
 * @notice NFTs that will be held by users
 */
contract LoanNFT is ERC1155PresetMinterPauser {

    using Counters for Counters.Counter;

    // Keep track of loan Ids
    Counters.Counter private _loanIdTracker;

    // contract URI for marketplaces
    string private _contractURI;

    // base url for each token metadata. Concatenates with ipfsHash for full path
    string private _baseURI;

    // Mapping from token ID to paused condition
    mapping(uint => bool) transfersPaused;

    // Mapping from token ID to IPFS hash (token metadata)
    mapping(uint => string) ipfsHashes;

    // Use a split bit implementation.
    // Store the generation in the upper 128 bits..
    uint256 constant GENERATION_MASK = uint256(uint128(~0)) << 128;

    // ..and the non-fungible loan id in the lower 128
    uint256 constant LOAN_ID_MASK = uint128(~0);

    /**
    * @dev Initializes the contract by setting the base URI
    */
    constructor() public ERC1155PresetMinterPauser(""){
        _baseURI = "ipfs://";
        _contractURI = "https://allianceblock.io/";
    }

    /**
    * @dev token metadata
    */
    function uri(uint tokenId) public view override returns(string memory){
        return Strings.strConcat(_baseURI, ipfsHashes[tokenId]);
    }

    /**
    * @dev contract metadata
    */
    function contractURI() public view returns(string memory){
        return _contractURI;
    }

    /**
     * @dev Owner can pause transfers for specific tokens
     */
    function pauseTokenTransfer(uint tokenId) external{
        require(hasRole(PAUSER_ROLE, _msgSender()), "ERC1155PresetMinterPauser: must have pauser role");
        transfersPaused[tokenId] = true;
    }

    /**
     * @dev Owner can unpause transfers for specific tokens
     */
    function unpauseTokenTransfer(uint tokenId) external{
        require(hasRole(PAUSER_ROLE, _msgSender()), "ERC1155PresetMinterPauser: must have pauser role");
        transfersPaused[tokenId] = false;
    }

    /**
     * @dev Format tokenId into generation and index
     */
    function formatTokenId(uint tokenId) public pure returns(uint generation, uint loanId){
        generation = tokenId & GENERATION_MASK;
        loanId = tokenId & LOAN_ID_MASK;
    }

    /**
     * @dev get tokenId from generation and loanId
     */
    function getTokenId(uint gen, uint loanId) public pure returns(uint tokenId){
        return gen | loanId;
    }

    /**
     * @dev Format tokenId into generation and index
     */
    function getCurrentLoanId() public view returns(uint loanId){
        return _loanIdTracker.current();
    }

    /**
     * @dev Mint generation 0 tokens
     */
    function mintGen0(address to, uint amount) public{
        uint tokenId = getTokenId(0, getCurrentLoanId());
        mint(to, tokenId, amount, "");
        _loanIdTracker.increment();
    }

    /**
     * @notice increase generation of a token
     * @dev token is burned, and new token is minted to user
     * @dev token owner should have approvedForAll before calling this function
     */
    function increaseGeneration(uint tokenId, address user, uint amount) external{
        (uint generation, uint loanId) = formatTokenId(tokenId);

        // Increase generation, leave loanId same
        uint newTokenId = getTokenId(generation++, loanId);

        // Burn previous gen tokens
        burn(user, tokenId, amount);

        // Mint new generation tokens
        mint(user, newTokenId, amount, "");
    }
    
    /**
     * @dev Validates if a token can be transferred
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data) 
        internal override
    {
        for(uint i=0; i< ids.length; i++){
            require(!transfersPaused[ids[i]], "Transfers paused");
        }
    }
}