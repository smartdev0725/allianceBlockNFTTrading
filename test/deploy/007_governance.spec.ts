import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';
import {
  DAO_LOAN_APPROVAL,
  DAO_MILESTONE_APPROVAL,
  AMOUNT_FOR_DAO_MEMBERSHIP,
} from '../../utils/constants';

describe('Contract Governance', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const governanceProxyContract = await deployments.get('Governance_Proxy');
    const governanceContract = await ethers.getContractAt(
      'Governance',
      governanceProxyContract.address
    );

    // When
    const approvalsNeeded = await governanceContract.approvalsNeeded();
    const loanApprovalRequestDuration =
      await governanceContract.loanApprovalRequestDuration();
    const milestoneApprovalRequestDuration =
      await governanceContract.milestoneApprovalRequestDuration();
    const amountStakedForDaoMembership =
      await governanceContract.amountStakedForDaoMembership();

    // Then
    expect(approvalsNeeded.toNumber()).to.equal(2);
    expect(loanApprovalRequestDuration.toNumber()).to.equal(DAO_LOAN_APPROVAL);
    expect(milestoneApprovalRequestDuration.toNumber()).to.equal(
      DAO_MILESTONE_APPROVAL
    );
    expect(amountStakedForDaoMembership.toString()).to.equal(
      ethers.utils.parseEther(AMOUNT_FOR_DAO_MEMBERSHIP + '').toString()
    );
  });
});
