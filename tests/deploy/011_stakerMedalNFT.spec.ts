import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract Staker Medal NFT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const stakerMedalNFTContract = await ethers.getContract('StakerMedalNFT');
    const stakingContract = await ethers.getContract('Staking');

    // When
    const stakerMedalNFTAddress = await stakingContract.stakerMedalNFT();
    const hasRoleMinterMedalContract = await stakerMedalNFTContract.hasRole(
      ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
      stakingContract.address
    );

    // Then
    expect(stakerMedalNFTAddress).to.equal(stakerMedalNFTContract.address);
    expect(hasRoleMinterMedalContract).to.equal(true);
  });

});
