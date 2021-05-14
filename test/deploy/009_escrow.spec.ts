import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract Escrow', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const escrowProxyContract = await deployments.get('Escrow_Proxy');
    const escrowContract = await ethers.getContractAt(
      'Escrow',
      escrowProxyContract.address
    );

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const mainNFTProxyContract = await deployments.get('MainNFT_Proxy');
    const lendingTokenContract = await deployments.get('LendingToken');

    // When
    const lendingToken = await escrowContract.lendingToken();
    const mainNFT = await escrowContract.mainNFT();
    const fundingNFT = await escrowContract.fundingNFT();

    // Then
    expect(lendingToken).to.equal(lendingTokenContract.address);
    expect(mainNFT).to.equal(mainNFTProxyContract.address);
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
  });
});
