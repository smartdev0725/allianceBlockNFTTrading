import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract rALBT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const rALBTContract = await ethers.getContract('rALBT');

    // When
    const name = await rALBTContract.name();
    const symbol = await rALBTContract.symbol();

    // Then
    expect(name).to.equal("Reputational AllianceBlock Token");
    expect(symbol).to.equal("rALBT");
  });
});
