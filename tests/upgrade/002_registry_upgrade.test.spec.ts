import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {getSigners, initializeTransfers} from '../helpers/utils';

describe('Registry upgrade test', () => {
  let approvalRequest: BigNumber;
  let loanIdBefore: BigNumber;
  let loanIdAfter: BigNumber;
  let amountOfInvestmentTokens: BigNumber;

  beforeEach(async () => {
    await deployments.fixture();

    const {
      seekerSigner,
      superDelegatorSigner,
      deployerSigner,
      lender1Signer,
      lender2Signer,
      lender3Signer,
    } = await getSigners();
    const {deployer, seeker, lender1, lender2, lender3, superDelegator} =
      await getNamedAccounts();

    const registryContract = await ethers.getContract('Registry');
    const governanceContract = await ethers.getContract('Governance');
    const projectTokenContract = await ethers.getContract('ProjectToken');
    const lendingTokenContract = await ethers.getContract('LendingToken');
    const collateralTokenContract = await ethers.getContract('CollateralToken');

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      {deployer, lender1, lender2, lender3, seeker},
      {
        deployerSigner,
        lender1Signer,
        lender2Signer,
        lender3Signer,
        seekerSigner,
      }
    );

    loanIdBefore = await registryContract.totalLoans();

    approvalRequest = await governanceContract.totalApprovalRequests();

    amountOfInvestmentTokens = ethers.utils.parseEther('100000');
    const amountRequested = ethers.utils.parseEther('10000');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    await registryContract
      .connect(seekerSigner)
      .requestInvestment(
        projectTokenContract.address,
        amountOfInvestmentTokens,
        amountRequested,
        ipfsHash
      );

    await governanceContract
      .connect(superDelegatorSigner)
      .superVoteForRequest(approvalRequest, true);

    loanIdAfter = await registryContract.totalLoans();
  });

  it('Investment should be ok', async function () {
    // Given
    const registryContract = await ethers.getContract('Registry');

    // When
    const loanDetails = await registryContract.loanDetails(loanIdBefore);

    // Then
    expect(loanDetails.loanId.toNumber()).to.equal(loanIdBefore.toNumber());
    expect(loanDetails.loanType).to.equal(2);
    expect(amountOfInvestmentTokens.toString()).to.equal(
      loanDetails.collateralAmount.toString()
    );
    // Check new method don't exist
    expect(() => registryContract.getSomething2()).to.throw(
      'registryContract.getSomething2 is not a function'
    );
    expect(() => registryContract.foo()).to.throw(
      'registryContract.foo is not a function'
    );
    expect(() => registryContract.bar()).to.throw(
      'registryContract.bar is not a function'
    );

    // Given
    const {proxyOwner} = await getNamedAccounts();
    const {deploy} = deployments;

    // When
    await deploy('Registry', {
      contract: 'RegistryV2Test',
      from: proxyOwner,
      proxy: {
        owner: proxyOwner,
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      log: true,
    });

    const registryContractUpgraded = await ethers.getContract('Registry');
    const something1 = await registryContractUpgraded.getSomething1();
    const something2 = await registryContractUpgraded.getSomething2();

    // Then
    expect(() => registryContractUpgraded.foo()).to.not.throw();
    expect(() => registryContractUpgraded.bar()).to.not.throw();
    expect(something1.toNumber()).to.equal(1);
    expect(something2.toNumber()).to.equal(2);

    const loanDetailsAfterUpdate = await registryContract.loanDetails(
      loanIdBefore
    );
    expect(loanDetailsAfterUpdate.loanId.toNumber()).to.equal(
      loanIdBefore.toNumber()
    );
    expect(loanDetailsAfterUpdate.loanType).to.equal(2);
    expect(amountOfInvestmentTokens.toString()).to.equal(
      loanDetailsAfterUpdate.collateralAmount.toString()
    );
  });
});
