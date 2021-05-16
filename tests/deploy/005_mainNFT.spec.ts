import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract MainNFT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const mainNFTProxyContract = await deployments.get('MainNFT_Proxy');
    const mainNFTContract = await ethers.getContractAt(
      'MainNFT',
      mainNFTProxyContract.address
    );

    // When
    const name = await mainNFTContract.callStatic.name();
    const symbol = await mainNFTContract.callStatic.symbol();

    // Then
    expect(name).to.equal('Alliance Block Custody NFT');
    expect(symbol).to.equal('bNFT');
  });
});
