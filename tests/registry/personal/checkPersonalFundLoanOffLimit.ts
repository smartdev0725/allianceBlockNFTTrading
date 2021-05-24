import {deployments, getNamedAccounts, ethers} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');
import {increaseTime} from '../../helpers/time';

export default async function suite() {
  describe('Personal fund loan off limit', async () => {
    it('when funding a personal loan off the limit should revert', async function () {
      // Given
      // Request personal loan on beforeEach

      // When
      await increaseTime(this.deployerSigner.provider, 30 * 24 * 60 * 60);

      // Then
      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .fundLoan(this.loanId, this.smallPartition),
        'Only between funding timeframe'
      );
    });
  });
}
