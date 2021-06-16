import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

import {BASE_AMOUNT} from '../../utils/constants';

const version = 'v0.1.0';
const contractName = 'Registry';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, get} = deployments;
  const {deployer, proxyOwner} = await getNamedAccounts();

  const chainId = await getChainId();
  if (+chainId !== 31337 && !process.env.LENDING_TOKEN_ADDRESS) {
    throw new Error("LENDING_TOKEN_ADDRESS env var should not be empty");
  }

  const escrowAddress = (await get('Escrow')).address;
  const governanceAddress = (await get('Governance')).address;
  const lendingTokenAddress = process.env.LENDING_TOKEN_ADDRESS
    ? process.env.LENDING_TOKEN_ADDRESS
    : (await get('LendingToken')).address;
  const fundingNFTAddress = (await get('FundingNFT')).address;

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      escrowAddress,
      governanceAddress,
      lendingTokenAddress,
      fundingNFTAddress,
      ethers.utils.parseEther(BASE_AMOUNT + '').toString(), // Same as toWei in web3
    ],
    log: true,
  });
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.dependencies = ['FundingNFT', 'LendingToken', 'Governance', 'Escrow'];
func.id = id;
