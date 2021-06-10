import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

const version = 'v0.1.0';
const contractName = 'ActionVerifier';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, get} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  const escrowContractAddress = (await get('Escrow')).address;
  const stakingContractAddress = (await get('Staking')).address;

  const chainId = await getChainId();

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [10, 10, escrowContractAddress, stakingContractAddress, chainId], // Other possible network 1337
    log: true,
  });
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.dependencies = ['Escrow', 'Staking'];
func.id = id;
