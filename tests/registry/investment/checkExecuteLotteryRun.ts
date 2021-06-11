import {ethers, getNamedAccounts} from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import {StakingType} from "../../helpers/registryEnums";
import {BigNumber} from "ethers";
import {increaseTime} from "../../helpers/time";
const { expectRevert } = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Check execute lottery', async () => {
    it('when execute lottery with a wrong id ', async function () {
      await expectRevert(
        this.registryContract.executeLotteryRun(1000),
        'Can run lottery only in Started state'
      );
    });

    it('when execute show interest for investment with wrong loanID param ', async function () {
      await expectRevert(
        this.registryContract.showInterestForInvestment(10, 20),
        'Can show interest only in Approved state'
      );
    });

    it('when execute show interest for investment with wrong partitions ', async function () {
      await expectRevert(
        this.registryContract.showInterestForInvestment(this.loanId, 0),
        'Cannot show interest for 0 partitions'
      );
    });

    it('when execute show interest for investment without lending tokens should revert', async function () {
      await expectRevert(
        this.registryContract.showInterestForInvestment(this.loanId, 10),
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('when execute lottery and the state is not started should revert  ', async function () {
      const numberOfPartitions = BigNumber.from(5);
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, numberOfPartitions);

      await expectRevert(
        this.registryContract.executeLotteryRun(this.loanId),
        'Can run lottery only in Started state'
      );
    });

    it('when execute lottery and can run lottery only if has remaining ticket  ', async function () {
      const numberOfPartitions = BigNumber.from(3000);
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      await this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, numberOfPartitions);

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.registryContract.connect(this.lender1Signer).executeLotteryRun(this.loanId);

      const ticketsRemainingAfter = await this.registryContract.ticketsRemaining(this.loanId);
      const remainingTicketsPerAddressAfter = await this.registryContract.remainingTicketsPerAddress(this.loanId, this.lender1);
      const ticketsWonPerAddressAfter = await this.registryContract.ticketsWonPerAddress(this.loanId, this.lender1);

      expect(remainingTicketsPerAddressAfter.toNumber()).to.be.equal(0);
      expect(ticketsRemainingAfter.toNumber()).to.be.equal(0);
      expect(ticketsWonPerAddressAfter.toNumber()).to.be.equal(
        numberOfPartitions.toNumber()
      );
    });
  });
}
