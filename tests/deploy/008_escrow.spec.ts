import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract Escrow', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const escrowContract = await ethers.getContract('Escrow');

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const lendingTokenContract = await deployments.get('LendingToken');

    // When
    const lendingToken = await escrowContract.lendingToken();
    const fundingNFT = await escrowContract.fundingNFT();

    // Then
    expect(lendingToken).to.equal(lendingTokenContract.address);
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
  });
});
