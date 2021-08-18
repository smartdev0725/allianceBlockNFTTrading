import {BigNumber, Contract, Signer} from 'ethers';
import {StakingType} from './ProjectEnums';

export interface IInvestment {
  investmentTokenContract: Contract;
  amountOfTokensToBePurchased: BigNumber;
  lendingTokenContract: Contract;
  totalAmountRequested: BigNumber;
  ipfsHash: string;
  seekerSigner: Signer;
}

export interface IInvestmentForApproval {
  investmentId: BigNumber;
  superDelegatorSigner: Signer;
  shouldApprove: boolean;
}

export interface IStake {
  lenderSigner: Signer;
  stakingLevel: StakingType;
}

export interface IAction {
  account: string;
  actionName: string;
  answer: string;
  referralId: number;
}

export interface IAddNewAction {
  action: IAction;
  reputationalAlbtRewardsPerLevel: BigNumber[];
  reputationalAlbtRewardsPerLevelAfterFirstTime: BigNumber[];
}

export interface IGetRALBTData {
  lenderSigner: Signer;
  actionCallerSigner: Signer;
  actions: IAction[];
}

export interface IShowInterestData {
  investmentId: BigNumber;
  lenderSigner: Signer;
  numberOfPartitions: BigNumber;
  lendingTokenContract: Contract;
}

export interface IRunLotteryData {
  investmentId: BigNumber;
  lotteryRunnerSigner: Signer;
}

export interface IFunderClaimRewardData {
  investmentId: BigNumber;
  lenderSigner: Signer;
  amountTicketsToBlock: BigNumber;
  lendingTokenContract: Contract;
}

export interface IExchangeNFTForInvestmentTokenData {
  investmentId: BigNumber;
  lenderSigner: Signer;
  investmentTokenContract: Contract;
}

export interface ISeekerClaimsFunding {
  investmentId: BigNumber;
  seekerSigner: Signer;
}

export interface IActionPerLender {
  name: string;
  lastEpoch: BigNumber;
  amountOfTimes: BigNumber;
  rewardPerActionLevel: BigNumber;
  rewardPerActionPerLevelAfterFirstTime: BigNumber;
}
export interface ILenderInfo {
  account: string;
  balanceBefore: BigNumber;
  stakingLevel: StakingType;
  actions: IActionPerLender[];
}
