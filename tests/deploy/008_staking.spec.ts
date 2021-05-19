import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract Staking', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const albtContract = await deployments.get('ALBT');
    const stakingContract = await ethers.getContract('Staking');

    // When
    const albtAddress = await stakingContract.albt();

    // Then
    expect(albtAddress).to.equal(albtContract.address);
  });
});
