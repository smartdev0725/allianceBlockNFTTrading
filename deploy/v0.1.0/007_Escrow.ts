import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';

const version = 'v0.1.0';
const contractName = 'Escrow';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  const lendingTokenAddress = process.env.LENDING_TOKEN_ADDRESS ? process.env.LENDING_TOKEN_ADDRESS: (await get('LendingToken')).address;
  const fundingNFTAddress = (await get('FundingNFT')).address;

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [lendingTokenAddress, fundingNFTAddress],
    log: true,
  });
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.dependencies = ['FundingNFT', 'LendingToken'];
func.id = id;
