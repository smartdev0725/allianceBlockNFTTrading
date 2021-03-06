import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {
  DAO_INVESTMENT_APPROVAL_REQUEST_DURATION,
  DAO_MILESTONE_APPROVAL_REQUEST_DURATION,
} from '../../utils/constants';
import {expect} from 'chai';

describe('Governance upgrade test', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('Governance should be deployed', async function () {
    // Given
    const governanceContract = await ethers.getContract('Governance');

    // When
    const superGovernanceAddress = await governanceContract.superDelegator();

    // Then
    expect(ethers.utils.isAddress(superGovernanceAddress)).to.equal(true);

    // Check new method don't exist
    expect(() => governanceContract.getSomething2()).to.throw(
      'governanceContract.getSomething2 is not a function'
    );

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
    const superGovernanceUpgradedAddress = await governanceContractUpgraded.superDelegator();
    expect(ethers.utils.isAddress(superGovernanceUpgradedAddress)).to.equal(true);


    // Check new Governance variables exist
    expect(foo.toNumber()).to.equal(0);
    expect(bar.toNumber()).to.equal(0);
    expect(something1.toNumber()).to.equal(1);
    expect(something2.toNumber()).to.equal(2);
  });
});
