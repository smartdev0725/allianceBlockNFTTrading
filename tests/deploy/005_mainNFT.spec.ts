import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract MainNFT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const mainNFTContract = await ethers.getContract('MainNFT');

    // When
    const name = await mainNFTContract.name();
    const symbol = await mainNFTContract.symbol();

    // Then
    expect(name).to.equal('Alliance Block Custody NFT');
    expect(symbol).to.equal('bNFT');
  });
});
