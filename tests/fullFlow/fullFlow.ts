import {BASE_AMOUNT} from '../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, ProjectStatusTypes} from '../helpers/ProjectEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Show investment interest', async () => {
    it('should do a full flow', async function () {
      const investmentId = await this.investmentContract.totalProjects();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('10000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await this.investmentContract
      .connect(this.seekerSigner)
      .requestInvestment(
        this.investmentTokenContract.address,
        amountOfTokensToBePurchased,
        this.lendingTokenContract.address,
        totalAmountRequested,
        ipfsHash
      );

      const investmentId2 = await this.investmentContract.totalProjects();
      expect(investmentId2).to.gt(investmentId);

      const status = await this.investmentContract.projectStatus(investmentId);
      expect(String(status)).to.be.equal(String(ProjectStatusTypes.REQUESTED));

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentId, true);

      const status2 = await this.investmentContract.projectStatus(investmentId);
      expect(String(status2)).to.be.equal(String(ProjectStatusTypes.APPROVED));
    });

  });
}
