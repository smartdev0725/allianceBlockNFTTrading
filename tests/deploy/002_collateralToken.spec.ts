import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract CollateralToken', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const collateralTokenContract = await ethers.getContract('CollateralToken');

    // When
    const name = await collateralTokenContract.name();
    const symbol = await collateralTokenContract.symbol();

    // Then
    expect(name).to.equal('Collateral Token');
    expect(symbol).to.equal('CLT');
  });
});
