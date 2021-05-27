import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {
  DAO_LOAN_APPROVAL_REQUEST_DURATION,
  DAO_MILESTONE_APPROVAL_REQUEST_DURATION
} from "../../utils/constants";
import {expect} from "chai";

describe('Governance upgrade test', () => {

  beforeEach(async () => {
    await deployments.fixture();
  });

  it("Governance should be deployed", async function() {
    // Given
    const governanceContract = await ethers.getContract('Governance');

    // When
    const [
      totalApprovalRequests, // Don't remove this
      approvalsNeededForRegistryRequest, // Don't remove this
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

    // Check new method don't exist
    expect(() => governanceContract.getSomething2()).to.throw('governanceContract.getSomething2 is not a function');

    // Given
    const {proxyOwner} = await getNamedAccounts();
    const {deploy} = deployments;

    // When
    await deploy('Governance', {
      contract: 'GovernanceV2Test',
      from: proxyOwner,
      proxy: {
        owner: proxyOwner,
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      log: true,
    });

    const governanceContractUpgraded = await ethers.getContract('Governance');
    const foo = await governanceContractUpgraded.foo();
    const bar = await governanceContractUpgraded.bar();
    const something1 = await governanceContractUpgraded.getSomething1();
    const something2 = await governanceContractUpgraded.getSomething2();

    // Then
    // Old Governance variables
    expect(loanApprovalRequestDuration.toNumber()).to.equal(
      DAO_LOAN_APPROVAL_REQUEST_DURATION
    );
    expect(milestoneApprovalRequestDuration.toNumber()).to.equal(
      DAO_MILESTONE_APPROVAL_REQUEST_DURATION
    );
    expect(amountToStakeForDaoMember.toNumber()).to.equal(3);

    // Check new Governance variables exist
    expect(foo.toNumber()).to.equal(0);
    expect(bar.toNumber()).to.equal(0);
    expect(something1.toNumber()).to.equal(1);
    expect(something2.toNumber()).to.equal(2);
  })
});
