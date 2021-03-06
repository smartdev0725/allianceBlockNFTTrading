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
  const stakerMedalNFTContractAddress = (await get('StakerMedalNFT')).address;

  const rewardsPerLevel = [
    ethers.utils.parseEther('0').toString(),
    ethers.utils.parseEther('5').toString(),
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('15').toString(),
  ];

  const actionsPerDayPerLevel = ['0', '5', '10', '15'];

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      rewardsPerLevel,
      actionsPerDayPerLevel,
      escrowContractAddress,
      stakerMedalNFTContractAddress,
    ], // Other possible network 1337
    log: true,
  });
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.dependencies = ['Escrowv0.1.0', 'StakerMedalNFTv0.1.0'];
func.id = id;
