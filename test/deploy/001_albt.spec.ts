import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract ALBT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const albtContract = await ethers.getContract('ALBT');

    // When
    const name = await albtContract.callStatic.name();
    const symbol = await albtContract.callStatic.symbol();

    // Then
    expect(name).to.equal('AllianceBlock Token');
    expect(symbol).to.equal('ALBT');
  });
});
