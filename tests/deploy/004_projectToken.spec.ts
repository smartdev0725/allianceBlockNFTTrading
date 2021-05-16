import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract ProjectToken', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const projectTokenContract = await ethers.getContract('ProjectToken');

    // When
    const name = await projectTokenContract.callStatic.name();
    const symbol = await projectTokenContract.callStatic.symbol();

    // Then
    expect(name).to.equal('Project Token');
    expect(symbol).to.equal('PT');
  });
});
