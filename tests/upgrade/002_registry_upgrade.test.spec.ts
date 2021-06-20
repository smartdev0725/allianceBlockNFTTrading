import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {getSigners, initializeTransfers} from '../helpers/utils';

describe('Registry upgrade test', () => {
  let approvalRequest: BigNumber;
  let investmentIdBefore: BigNumber;
  let investmentIdAfter: BigNumber;
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

    investmentIdBefore = await registryContract.totalInvestments();

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

    investmentIdAfter = await registryContract.totalInvestments();
  });

  it('Investment should be ok', async function () {
    // Given
    const registryContract = await ethers.getContract('Registry');

    // When
    const investmentDetails = await registryContract.investmentDetails(
      investmentIdBefore
    );

    // Then
    expect(investmentDetails.investmentId.toNumber()).to.equal(
      investmentIdBefore.toNumber()
    );
    expect(amountOfInvestmentTokens.toString()).to.equal(
      investmentDetails.projectTokensAmount.toString()
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

    const investmentDetailsAfterUpdate =
      await registryContract.investmentDetails(investmentIdBefore);
    expect(investmentDetailsAfterUpdate.investmentId.toNumber()).to.equal(
      investmentIdBefore.toNumber()
    );
    expect(amountOfInvestmentTokens.toString()).to.equal(
      investmentDetailsAfterUpdate.projectTokensAmount.toString()
    );
  });
});
