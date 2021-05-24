import {deployments, ethers} from 'hardhat';

import {ContractReceipt, ContractTransaction} from 'ethers';

export const getSigners = async () => {
  const signers = await ethers.getSigners();
  return {
    deployerSigner: signers[0],
    proxyOwnerSigner: signers[1],
    delegator1Signer: signers[2],
    delegator2Signer: signers[3],
    staker1Signer: signers[4],
    staker2Signer: signers[5],
    rewardDistributorSigner: signers[6],
    lender1Signer: signers[7],
    lender2Signer: signers[8],
    lender3Signer: signers[9],
    seekerSigner: signers[10],
    superDelegatorSigner: signers[11],
  };
};

export const getContracts = async () => {
  const registryContract = await ethers.getContract('Registry');

  const governanceContract = await ethers.getContract('Governance');

  const fundingNFTContract = await ethers.getContract('FundingNFT');

  const escrowContract = await ethers.getContract('Escrow');

  const stakingContract = await ethers.getContract('Staking');

  const lendingTokenContract = await ethers.getContract('LendingToken');

  const projectTokenContract = await ethers.getContract('ProjectToken');

  const collateralTokenContract = await ethers.getContract('CollateralToken');

  const ALBTContract = await ethers.getContract('ALBT');

  return {
    registryContract,
    governanceContract,
    fundingNFTContract,
    escrowContract,
    lendingTokenContract,
    projectTokenContract,
    collateralTokenContract,
    ALBTContract,
    stakingContract,
  };
};

export const initializeTransfers = async (
  contracts: any,
  accounts: any,
  signers: any
) => {
  const {
    registryContract,
    lendingTokenContract,
    projectTokenContract,
    collateralTokenContract,
  } = contracts;

  const {lender1, lender2, lender3, seeker, deployer} = accounts;
  const {
    deployerSigner,
    lender1Signer,
    lender2Signer,
    lender3Signer,
    seekerSigner,
  } = signers;

  // Transfer tokens.
  const amountToTransfer = ethers.utils.parseEther('10000000');

  // Lender 1 minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender1, amountToTransfer);
  await lendingTokenContract
    .connect(lender1Signer)
    .approve(registryContract.address, amountToTransfer);

  // Lender 2 minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender2, amountToTransfer);
  await lendingTokenContract
    .connect(lender2Signer)
    .approve(registryContract.address, amountToTransfer);

  // Lender 3 minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender3, amountToTransfer);
  await lendingTokenContract
    .connect(lender3Signer)
    .approve(registryContract.address, amountToTransfer);

  // Seeker minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(seeker, amountToTransfer);
  await lendingTokenContract
    .connect(seekerSigner)
    .approve(registryContract.address, amountToTransfer);
  await collateralTokenContract
    .connect(deployerSigner)
    .mint(seeker, amountToTransfer);
  await collateralTokenContract
    .connect(seekerSigner)
    .approve(registryContract.address, amountToTransfer);
  await projectTokenContract
    .connect(deployerSigner)
    .mint(seeker, amountToTransfer);
  await projectTokenContract
    .connect(seekerSigner)
    .approve(registryContract.address, amountToTransfer);
};

export const waitFor = (
  p: Promise<ContractTransaction>
): Promise<ContractReceipt> => {
  return p.then((tx) => tx.wait());
};