import {ethers} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Registry initialization', async () => {
    it('When initialize again should revert', async function () {
      const reputationalAlbt = "0x664f6b4987d9db811867f431911124109ed5a475";
      const totalTicketsPerRun = 10;
      const rAlbtPerLotteryNumber = 10;
      const blocksLockedForReputation = 10;
      const lotteryNumbersForImmediateTicket = 10;

      await expectRevert(
        this.registryContract.initializeInvestment(reputationalAlbt, totalTicketsPerRun, rAlbtPerLotteryNumber, blocksLockedForReputation, lotteryNumbersForImmediateTicket),
        'Cannot initialize second time'
      );
    });

    it('When initialize with zero address should revert', async function () {
      const totalTicketsPerRun = 10;
      const rAlbtPerLotteryNumber = 10;
      const blocksLockedForReputation = 10;
      const lotteryNumbersForImmediateTicket = 10;
      await expectRevert(
        this.registryContract.initializeInvestment( ethers.constants.AddressZero, totalTicketsPerRun, rAlbtPerLotteryNumber, blocksLockedForReputation, lotteryNumbersForImmediateTicket),
        'Cannot initialize with 0 addresses'
      );
    });

    it('When initialize with zero values should revert', async function () {
      const reputationalAlbt = "0x664f6b4987d9db811867f431911124109ed5a475";
      const totalTicketsPerRun = 0;
      const rAlbtPerLotteryNumber = 0;
      const blocksLockedForReputation = 0;
      const lotteryNumbersForImmediateTicket = 0;
      await expectRevert(
        this.registryContract.initializeInvestment(reputationalAlbt, totalTicketsPerRun, rAlbtPerLotteryNumber, blocksLockedForReputation, lotteryNumbersForImmediateTicket),
        'Cannot initialize with 0 values'
      );
    });

  });
}
