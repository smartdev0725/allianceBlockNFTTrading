import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract FundingNFT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const fundingNFTContract = await ethers.getContract('FundingNFT');

    // When
    const contractUri = await fundingNFTContract.contractURI();

    // Then
    expect(contractUri).to.equal('https://allianceblock.io/');
  });
});
