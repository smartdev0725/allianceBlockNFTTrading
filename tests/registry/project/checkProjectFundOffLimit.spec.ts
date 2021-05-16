import BN from 'bn.js';
import {ONE_DAY} from '../../helpers/constants';
import {getCurrentTimestamp, increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';

describe('Check project fund off limit', async () => {
  let registryContract: any;
  let governanceContract: any;
  let fundingNFTContract: any;
  let escrowContract: any;
  let lendingTokenContract: any;
  let projectTokenContract: any;
  let collateralTokenContract: any;

  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, seeker, lender1, lender2} = await getNamedAccounts();
    const {deployerSigner, lender1Signer, lender2Signer, seekerSigner} =
      await getSigners();

    // Get contracts
    ({
      registryContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      projectTokenContract,
      collateralTokenContract,
    } = await getContracts());

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      {lender1, lender2, seeker, deployer},
      {deployerSigner, lender1Signer, lender2Signer, seekerSigner}
    );
  });

  it('when funding a project loan off the limit should revert', async function () {
    // Given
    const {
      deployerSigner,
      lender1Signer,
      delegator1Signer,
      delegator2Signer,
      staker1Signer,
    } = await getSigners();

    const loanId = await registryContract.totalLoans();
    const approvalRequest = await governanceContract.totalApprovalRequests();
    const smallPartition = BigNumber.from(25);

    const amountCollateralized = ethers.utils.parseEther('100000');
    const projectTokenPrice = BigNumber.from('1');
    const interestPercentage = BigNumber.from(20);
    const discountPerMillion = BigNumber.from(300000);
    const totalMilestones = BigNumber.from(3);
    const paymentTimeInterval = BigNumber.from(3600);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const milestoneDurations = new Array<BigNumber>(totalMilestones);
    const amountRequestedPerMilestone = new Array<BigNumber>(totalMilestones);
    const currentTime = await getCurrentTimestamp();

    for (let i = 0; i < Number(totalMilestones); i++) {
      milestoneDurations[i] = BigNumber.from(
        currentTime.add(new BN((i + 1) * ONE_DAY)).toString()
      );
      amountRequestedPerMilestone[i] = ethers.utils.parseEther('10000');
    }

    await registryContract
      .connect(deployerSigner)
      .requestProjectLoan(
        amountRequestedPerMilestone,
        projectTokenContract.address,
        amountCollateralized,
        projectTokenPrice,
        interestPercentage,
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash
      );

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);

    // When
    await increaseTime(staker1Signer.provider, 30 * 24 * 60 * 60); // One Month

    // Then
    await expectRevert(
      registryContract.connect(lender1Signer).fundLoan(loanId, smallPartition),
      'Only between funding timeframe'
    );
  });
});
