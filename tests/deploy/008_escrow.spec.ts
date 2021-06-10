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
    const rALBTFactory = await ethers.getContractFactory("rALBT");
    const rALBTAddress = await escrowContract.reputationalALBT();
    const rALBTContract = await rALBTFactory.attach(rALBTAddress);

    // Then
    expect(lendingToken).to.equal(lendingTokenContract.address);
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
    expect(await rALBTContract.provider.getCode(rALBTContract.address)).to.not.equal("0x");
  });
});
