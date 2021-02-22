/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface StorageContract extends Truffle.Contract<StorageInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<StorageInstance>;
}

type AllEvents = never;

export interface StorageInstance extends Truffle.ContractInstance {
  baseAmountForEachPartition(
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  escrow(txDetails?: Truffle.TransactionDetails): Promise<string>;

  getLoanStatus: {
    (
      loanId: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      loanId: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      loanId: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      loanId: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  governance(txDetails?: Truffle.TransactionDetails): Promise<string>;

  lendingToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

  loanBorrower(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  loanDetails(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<{
    0: BN;
    1: BN;
    2: BN;
    3: string;
    4: BN;
    5: BN;
    6: BN;
    7: BN;
    8: string;
    9: BN;
  }>;

  loanNFT(txDetails?: Truffle.TransactionDetails): Promise<string>;

  loanStatus(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  mainNFT(txDetails?: Truffle.TransactionDetails): Promise<string>;

  maxMilestones(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  milestoneExtensionInterval(
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  minimumInterestPercentage(
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  personalLoanPayments(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<{ 0: BN; 1: BN; 2: BN; 3: BN; 4: BN; 5: BN; 6: BN; 7: BN }>;

  projectLoanPayments(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<{ 0: BN; 1: BN; 2: BN; 3: BN; 4: BN; 5: BN; 6: BN; 7: BN }>;

  totalLoans(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  vestingBatches(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  vestingTimeInterval(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  methods: {
    baseAmountForEachPartition(
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    escrow(txDetails?: Truffle.TransactionDetails): Promise<string>;

    getLoanStatus: {
      (
        loanId: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        loanId: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        loanId: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        loanId: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    governance(txDetails?: Truffle.TransactionDetails): Promise<string>;

    lendingToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

    loanBorrower(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    loanDetails(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<{
      0: BN;
      1: BN;
      2: BN;
      3: string;
      4: BN;
      5: BN;
      6: BN;
      7: BN;
      8: string;
      9: BN;
    }>;

    loanNFT(txDetails?: Truffle.TransactionDetails): Promise<string>;

    loanStatus(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    mainNFT(txDetails?: Truffle.TransactionDetails): Promise<string>;

    maxMilestones(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    milestoneExtensionInterval(
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    minimumInterestPercentage(
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    personalLoanPayments(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<{ 0: BN; 1: BN; 2: BN; 3: BN; 4: BN; 5: BN; 6: BN; 7: BN }>;

    projectLoanPayments(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<{ 0: BN; 1: BN; 2: BN; 3: BN; 4: BN; 5: BN; 6: BN; 7: BN }>;

    totalLoans(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    vestingBatches(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    vestingTimeInterval(txDetails?: Truffle.TransactionDetails): Promise<BN>;
  };

  getPastEvents(event: string): Promise<EventData[]>;
  getPastEvents(
    event: string,
    options: PastEventOptions,
    callback: (error: Error, event: EventData) => void
  ): Promise<EventData[]>;
  getPastEvents(event: string, options: PastEventOptions): Promise<EventData[]>;
  getPastEvents(
    event: string,
    callback: (error: Error, event: EventData) => void
  ): Promise<EventData[]>;
}
