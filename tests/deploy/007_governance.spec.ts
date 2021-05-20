import {ethers, deployments} from 'hardhat';
import {expect} from 'chai';
import {
  DAO_LOAN_APPROVAL_REQUEST_DURATION,
  DAO_MILESTONE_APPROVAL_REQUEST_DURATION,
} from '../../utils/constants';

describe('Contract Governance', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const governanceContract = await ethers.getContract('Governance');

    // When
    const [
      totalApprovalRequests,
      approvalsNeededForRegistryRequest,
      loanApprovalRequestDuration,
      milestoneApprovalRequestDuration,
      amountToStakeForDaoMember,
    ] = await governanceContract.getDaoData();

    // Then
    expect(loanApprovalRequestDuration.toNumber()).to.equal(
      DAO_LOAN_APPROVAL_REQUEST_DURATION
    );
    expect(milestoneApprovalRequestDuration.toNumber()).to.equal(
      DAO_MILESTONE_APPROVAL_REQUEST_DURATION
    );
    expect(amountToStakeForDaoMember.toNumber()).to.equal(3);
  });
});
