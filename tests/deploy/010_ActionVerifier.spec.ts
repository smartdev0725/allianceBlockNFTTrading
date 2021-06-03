import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract ActionVerifier', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const actionVerifierContract = await ethers.getContract('ActionVerifier');

    const escrowContract = await deployments.get('Escrow');
    const stakingContract = await deployments.get('Staking');

    // When
    const escrowAddress = await actionVerifierContract.escrow();
    const stakingAddress = await actionVerifierContract.staking();

    // Then
    expect(escrowAddress).to.equal(escrowContract.address);
    expect(stakingAddress).to.equal(stakingContract.address);
  });
});
