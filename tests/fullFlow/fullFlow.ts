import {BASE_AMOUNT} from '../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../helpers/registryEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Show investment interest', async () => {
    it('should do a full flow', async function () {
      const investmentId = await this.registryContract.totalInvestments();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('10000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await this.registryContract
      .connect(this.seekerSigner)
      .requestInvestment(
        this.investmentTokenContract.address,
        amountOfTokensToBePurchased,
        this.lendingTokenContract.address,
        totalAmountRequested,
        ipfsHash
      );

      const investmentId2 = await this.registryContract.totalInvestments();
      expect(investmentId2).to.gt(investmentId);

      const status = await this.registryContract.investmentStatus(investmentId);
      expect(String(status)).to.be.equal(String(InvestmentStatus.REQUESTED));

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentId, true);

      const status2 = await this.registryContract.investmentStatus(investmentId);
      expect(String(status2)).to.be.equal(String(InvestmentStatus.APPROVED));
    });

  });
}
