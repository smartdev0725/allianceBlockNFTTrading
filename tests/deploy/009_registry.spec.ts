import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract Registry', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const registryContract = await ethers.getContract('Registry');

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const lendingTokenContract = await deployments.get('LendingToken');

    // When
    const lendingToken = await registryContract.lendingToken();
    const fundingNFT = await registryContract.fundingNFT();

    // Then
    expect(lendingToken).to.equal(lendingTokenContract.address);
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
  });
});
