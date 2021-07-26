import {BigNumber, Contract, Signer} from 'ethers';
import {StakingType} from './registryEnums';

export interface Investment {
  investmentTokenContract: Contract;
  amountOfTokensToBePurchased: BigNumber;
  lendingTokenContract: Contract;
  totalAmountRequested: BigNumber;
  ipfsHash: string;
  seekerSigner: Signer;
}

export interface InvestmentForApproval {
  investmentId: BigNumber;
  superDelegatorSigner: Signer;
  approve: boolean;
}

export interface Stake {
  lenderSigner: Signer;
  stakingLevel: StakingType;
}

export interface GetRALBTData {
  lenderSigner: Signer;
  actionCallerSigner: Signer;
}

export interface ShowInterestData {
  investmentId: BigNumber;
  lenderSigner: Signer;
  numberOfPartitions: BigNumber;
  lendingTokenContract: Contract;
}

export interface RunLotteryData {
  investmentId: BigNumber;
  lotteryRunnerSigner: Signer;
}

export interface FunderClaimRewardData {
  investmentId: BigNumber;
  lenderSigner: Signer;
  amountTicketsToBlock: BigNumber;
  lendingTokenContract: Contract;
}

export interface ExchangeNFTForInvestmentTokenData {
  investmentId: BigNumber;
  lenderSigner: Signer;
  investmentTokenContract: Contract;
}
