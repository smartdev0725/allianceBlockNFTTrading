import {expect} from 'chai';
import {ethers} from 'hardhat';

export default async function suite() {
  describe.only('Succeeds', async () => {

    it('should get correct contract uri', async function () {
      // Given
      const contractURI = await this.fundingNFTContract.contractURI();
      // When and Then
      expect(contractURI).to.equal('https://allianceblock.io/');
    });

    it('should get correct role keys', async function () {
      // Given
      const MINTER_ROLE = await this.fundingNFTContract.MINTER_ROLE();
      const PAUSER_ROLE = await this.fundingNFTContract.PAUSER_ROLE();

      // When and Then
      expect(MINTER_ROLE).to.equal(ethers.utils.solidityKeccak256([ "string", ], [ "MINTER_ROLE" ]));
      expect(PAUSER_ROLE).to.equal(ethers.utils.solidityKeccak256([ "string", ], [ "PAUSER_ROLE" ]));

    });

    it('should get correct role status', async function () {
      // Given
      const isMinter = await this.fundingNFTContract.hasRole(
        ethers.utils.solidityKeccak256([ "string", ], [ "MINTER_ROLE" ]),
        this.registryContract.address
      );

      const isPauser = await this.fundingNFTContract.hasRole(
        ethers.utils.solidityKeccak256([ "string", ], [ "PAUSER_ROLE" ]),
        this.registryContract.address
      );

      // When and Then
      expect(isMinter).to.be.equal(true);
      expect(isPauser).to.be.equal(true);
    });

    it('should get correct role status for other address', async function () {
      // Given
      const isMinter = await this.fundingNFTContract.hasRole(
        ethers.utils.solidityKeccak256([ "string", ], [ "MINTER_ROLE" ]),
        this.lender1
      );

      const isPauser = await this.fundingNFTContract.hasRole(
        ethers.utils.solidityKeccak256([ "string", ], [ "PAUSER_ROLE" ]),
        this.lender1
      );

      // When and Then
      expect(isMinter).to.be.equal(false);
      expect(isPauser).to.be.equal(false);
    });

    it('should get correct interface support', async function () {
      // Given
      const supportERC1155 = await this.fundingNFTContract.supportsInterface('0xd9b67a26');
      const supportMetadata = await this.fundingNFTContract.supportsInterface('0x0e89341c');

      // When and Then
      expect(supportERC1155).to.be.equal(true);
      expect(supportMetadata).to.be.equal(true);
    });
  });
}
