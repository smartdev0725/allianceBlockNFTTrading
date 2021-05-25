import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract LendingToken', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const lendingTokenContract = await ethers.getContract('LendingToken');

    // When
    const name = await lendingTokenContract.name();
    const symbol = await lendingTokenContract.symbol();

    // Then
    expect(name).to.equal('Lending Token');
    expect(symbol).to.equal('LGT');
  });
});
