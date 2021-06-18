import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';

describe('Contract InvestmentToken', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const investmentTokenContract = await ethers.getContract('InvestmentToken');

    // When
    const name = await investmentTokenContract.name();
    const symbol = await investmentTokenContract.symbol();

    // Then
    expect(name).to.equal('Investment Token');
    expect(symbol).to.equal('IT');
  });
});
