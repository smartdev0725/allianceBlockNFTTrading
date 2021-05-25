import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  const LendingToken = await get('LendingToken');
  const MainNFT = await get('MainNFT');
  const FundingNFT = await get('FundingNFT');

  await deploy('Escrow', {
    contract: 'Escrow',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [LendingToken.address, MainNFT.address, FundingNFT.address],
    log: true,
  });
};
export default func;
func.tags = ['Escrow'];
func.dependencies = ['LendingToken', 'FundingNFT', 'MainNFT'];
