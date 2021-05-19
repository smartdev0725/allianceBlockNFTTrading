import {increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Check project fund off limit', async () => {
    it('when funding a project loan off the limit should revert', async function () {
      // When
      await increaseTime(this.lender1Signer.provider, 30 * 24 * 60 * 60); // One Month

      // Then
      await expectRevert(
        this.registryContract.connect(this.lender1Signer).fundLoan(this.loanId, this.smallPartition),
        'Only between funding timeframe'
      );
    });
  });
}
