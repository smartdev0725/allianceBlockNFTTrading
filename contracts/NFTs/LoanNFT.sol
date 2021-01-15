// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../utils/Strings.sol";

/**
 * @title Alliance Block Loan NFTs
 * @notice NFTs that will be held by users
 */
contract LoanNFT is ERC1155PresetMinterPauser {

    // contract URI for marketplaces
    string private _contractURI;

    // base url for each token metadata. Concatenates with ipfsHash for full path
    string private _baseURI;

    // Mapping from token ID to paused condition
    mapping(uint => bool) transfersPaused;

    // Mapping from token ID to IPFS hash (token metadata)
    mapping(uint => string) ipfsHashes;

    /**
    * @dev Initializes the contract by setting the base URI
    */
    constructor() public ERC1155PresetMinterPauser(""){
        _baseURI = "https://ipfs.io/ipfs/";
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