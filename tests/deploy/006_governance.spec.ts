import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract Governance', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const governanceContract = await ethers.getContract('Governance');

    // When
    const superGovernanceAddress = await governanceContract.superDelegator();

    // Then
    expect(ethers.utils.isAddress(superGovernanceAddress)).to.equal(true);
  });
});
