import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('FundingNFT', {
    contract: 'FundingNFT',
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: ['ipfs://', 'https://allianceblock.io/'],
    log: true,
  });
};
export default func;
func.tags = ['FundingNFT'];
