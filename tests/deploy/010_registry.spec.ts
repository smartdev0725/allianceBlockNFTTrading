import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract Registry', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const registryProxyContract = await deployments.get('Registry_Proxy');
    const registryContract = await ethers.getContractAt(
      'Registry',
      registryProxyContract.address
    );

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const mainNFTProxyContract = await deployments.get('MainNFT_Proxy');
    const lendingTokenContract = await deployments.get('LendingToken');

    // When
    const lendingToken = await registryContract.lendingToken();
    const mainNFT = await registryContract.mainNFT();
    const fundingNFT = await registryContract.fundingNFT();

    // Then
    expect(lendingToken).to.equal(lendingTokenContract.address);
    expect(mainNFT).to.equal(mainNFTProxyContract.address);
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
  });
});
