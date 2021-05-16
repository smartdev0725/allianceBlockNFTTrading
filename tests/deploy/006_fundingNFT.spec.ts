import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract FundingNFT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const fundingNFTContract = await ethers.getContractAt(
      'FundingNFT',
      fundingNFTProxyContract.address
    );

    // When
    const contractUri = await fundingNFTContract.callStatic.contractURI();

    // Then
    expect(contractUri).to.equal('https://allianceblock.io/');
  });
});
