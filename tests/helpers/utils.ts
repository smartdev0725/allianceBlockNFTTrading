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
  const investmentContract = await ethers.getContract('Investment');

  const governanceContract = await ethers.getContract('Governance');

  const fundingNFTContract = await ethers.getContract('FundingNFT');

  const escrowContract = await ethers.getContract('Escrow');

  const stakingContract = await ethers.getContract('Staking');

  const stakerMedalNFTContract = await ethers.getContract('StakerMedalNFT');

  const lendingTokenContract = await ethers.getContract('LendingToken');

  const investmentTokenContract = await ethers.getContract('InvestmentToken');

  const collateralTokenContract = await ethers.getContract('CollateralToken');

  const ALBTContract = await ethers.getContract('ALBT');

  const actionVerifierContract = await ethers.getContract('ActionVerifier');

  const rALBTFactory = await ethers.getContractFactory('rALBT');
  const rALBTAddress = await escrowContract.reputationalALBT();
  const rALBTContract = await rALBTFactory.attach(rALBTAddress);

  return {
    investmentContract,
    governanceContract,
    fundingNFTContract,
    escrowContract,
    lendingTokenContract,
    investmentTokenContract,
    collateralTokenContract,
    ALBTContract,
    stakingContract,
    rALBTContract,
    actionVerifierContract,
    stakerMedalNFTContract,
  };
};

export const initializeTransfers = async (
  contracts: any,
  accounts: any,
  signers: any
) => {
  const {
    investmentContract,
    lendingTokenContract,
    investmentTokenContract,
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
    .approve(investmentContract.address, amountToTransfer);

  // Lender 2 minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender2, amountToTransfer);
  await lendingTokenContract
    .connect(lender2Signer)
    .approve(investmentContract.address, amountToTransfer);

  // Lender 3 minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(lender3, amountToTransfer);
  await lendingTokenContract
    .connect(lender3Signer)
    .approve(investmentContract.address, amountToTransfer);

  // Seeker minting
  await lendingTokenContract
    .connect(deployerSigner)
    .mint(seeker, amountToTransfer);
  await lendingTokenContract
    .connect(seekerSigner)
    .approve(investmentContract.address, amountToTransfer);
  await collateralTokenContract
    .connect(deployerSigner)
    .mint(seeker, amountToTransfer);
  await collateralTokenContract
    .connect(seekerSigner)
    .approve(investmentContract.address, amountToTransfer);
  await investmentTokenContract
    .connect(deployerSigner)
    .mint(seeker, amountToTransfer);
  await investmentTokenContract
    .connect(seekerSigner)
    .approve(investmentContract.address, amountToTransfer);
};

export const waitFor = (
  p: Promise<ContractTransaction>
): Promise<ContractReceipt> => {
  return p.then((tx) => tx.wait());
};

export const getSignature = async (
  actionName: string,
  answer: string,
  account: string,
  referralId: number,
  actionVerifierContract: string,
  web3: any
) => {
  const message = {
    actionName,
    answer,
    account,
    referralId,
  };

  const msgParams = JSON.stringify({
    domain: {
      name: 'AllianceBlock Verifier',
      version: '1.0',
      chainId: 31337,
      verifyingContract: actionVerifierContract,
    },

    // Defining the message signing data content.
    message,
    // Refers to the keys of the *types* object below.
    primaryType: 'Action',
    types: {
      // TODO: Clarify if EIP712Domain refers to the domain the contract is hosted on
      EIP712Domain: [
        {name: 'name', type: 'string'},
        {name: 'version', type: 'string'},
        {name: 'chainId', type: 'uint256'},
        {name: 'verifyingContract', type: 'address'},
      ],
      Action: [
        {name: 'actionName', type: 'string'},
        {name: 'answer', type: 'string'},
        {name: 'account', type: 'address'},
        {name: 'referralId', type: 'uint256'},
      ],
    },
  });

  const from = account;

  const params = [from, msgParams];
  const method = 'eth_signTypedData_v4';

  return new Promise((resolve, reject) =>
    web3.currentProvider.send(
      {
        method,
        params,
        from,
      },
      async function (err: any, result: any) {
        if (err) {
          reject(err);
        } else if (result.error) {
          reject(result.error);
        } else {
          resolve(result.result);
        }
      }
    )
  );
};
