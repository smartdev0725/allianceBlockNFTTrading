import {deployments, ethers} from 'hardhat';
import {toWei} from 'web3-utils';

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
    seekerSigner: signers[9],
  };
};

export const getContracts = async () => {
  const registryProxyContract = await deployments.get('Registry_Proxy');
  const registryContract = await ethers.getContractAt(
    'Registry',
    registryProxyContract.address
  );

  const governanceProxyContract = await deployments.get('Governance_Proxy');
  const governanceContract = await ethers.getContractAt(
    'Governance',
    governanceProxyContract.address
  );

  const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
  const fundingNFTContract = await ethers.getContractAt(
    'FundingNFT',
    fundingNFTProxyContract.address
  );

  const escrowProxyContract = await deployments.get('Escrow_Proxy');
  const escrowContract = await ethers.getContractAt(
    'Escrow',
    escrowProxyContract.address
  );

  const lendingTokenContract = await ethers.getContract('LendingToken');

  const projectTokenContract = await ethers.getContract('ProjectToken');

  const collateralTokenContract = await ethers.getContract('CollateralToken');

  return {
    registryContract,
    governanceContract,
    fundingNFTContract,
    escrowContract,
    lendingTokenContract,
    projectTokenContract,
    collateralTokenContract,
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

  const {lender1, lender2, seeker, deployer} = accounts;
  const {deployerSigner, lender1Signer, lender2Signer, seekerSigner} = signers;

  // Transfer tokens.
  const amountToTransfer = ethers.utils.parseEther('10000000');

  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender1, amountToTransfer);
  await lendingTokenContract
    .connect(lender1Signer)
    .approve(registryContract.address, amountToTransfer);

  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender2, amountToTransfer);
  await lendingTokenContract
    .connect(lender2Signer)
    .approve(registryContract.address, amountToTransfer);

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
    .mint(deployer, amountToTransfer);
  await projectTokenContract
    .connect(deployerSigner)
    .approve(registryContract.address, amountToTransfer);
};
