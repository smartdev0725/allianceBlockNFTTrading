import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {getSigners, initializeTransfers} from '../helpers/utils';

describe('Investment upgrade test', () => {
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

    const investmentContract = await ethers.getContract('Investment');
    const governanceContract = await ethers.getContract('Governance');
    const investmentTokenContract = await ethers.getContract('InvestmentToken');
    const lendingTokenContract = await ethers.getContract('LendingToken');
    const collateralTokenContract = await ethers.getContract('CollateralToken');

    // Initialize Transfers
    await initializeTransfers(
      {
        investmentContract,
        lendingTokenContract,
        investmentTokenContract,
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

    investmentIdBefore = await investmentContract.totalInvestments();

    approvalRequest = await governanceContract.totalApprovalRequests();

    amountOfInvestmentTokens = ethers.utils.parseEther('100000');
    const amountRequested = ethers.utils.parseEther('10000');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    await investmentContract
      .connect(seekerSigner)
      .requestInvestment(
        investmentTokenContract.address,
        amountOfInvestmentTokens,
        lendingTokenContract.address,
        amountRequested,
        ipfsHash
      );

    await governanceContract
      .connect(superDelegatorSigner)
      .superVoteForRequest(approvalRequest, true);

    investmentIdAfter = await investmentContract.totalInvestments();
  });

  it('Investment should be ok', async function () {
    // Given
    const investmentContract = await ethers.getContract('Investment');

    // When
    const investmentDetails = await investmentContract.investmentDetails(investmentIdBefore);

    // Then
    expect(investmentDetails.investmentId.toNumber()).to.equal(investmentIdBefore.toNumber());
    expect(amountOfInvestmentTokens.toString()).to.equal(
      investmentDetails.investmentTokensAmount.toString()
    );
    // Check new method don't exist
    expect(() => investmentContract.getSomething2()).to.throw(
      'investmentContract.getSomething2 is not a function'
    );
    expect(() => investmentContract.foo()).to.throw(
      'investmentContract.foo is not a function'
    );
    expect(() => investmentContract.bar()).to.throw(
      'investmentContract.bar is not a function'
    );

    // Given
    const {proxyOwner} = await getNamedAccounts();
    const {deploy} = deployments;

    // When
    await deploy('Investment', {
      contract: 'InvestmentV2Test',
      from: proxyOwner,
      proxy: {
        owner: proxyOwner,
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      log: true,
    });

    const investmentContractUpgraded = await ethers.getContract('Investment');
    const something1 = await investmentContractUpgraded.getSomething1();
    const something2 = await investmentContractUpgraded.getSomething2();

    // Then
    expect(() => investmentContractUpgraded.foo()).to.not.throw();
    expect(() => investmentContractUpgraded.bar()).to.not.throw();
    expect(something1.toNumber()).to.equal(1);
    expect(something2.toNumber()).to.equal(2);

    const investmentDetailsAfterUpdate = await investmentContract.investmentDetails(
      investmentIdBefore
    );
    expect(investmentDetailsAfterUpdate.investmentId.toNumber()).to.equal(
      investmentIdBefore.toNumber()
    );
    expect(amountOfInvestmentTokens.toString()).to.equal(
      investmentDetailsAfterUpdate.investmentTokensAmount.toString()
    );
  });
});
