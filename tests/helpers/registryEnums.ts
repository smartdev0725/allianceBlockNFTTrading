export enum RepaymentBatchType {
  ONLY_INTEREST = '0',
  INTEREST_PLUS_NOMINAL = '1',
}

export enum LoanType {
  PERSONAL = '0',
  PROJECT = '1',
}

export enum LoanStatus {
  REQUESTED = '0',
  APPROVED = '1',
  FUNDING = '2',
  STARTED = '3',
  AWAITING_MILESTONE_APPROVAL = '4',
  AWAITING_REPAYMENT = '5',
  SETTLED = '6',
  DEFAULT = '7',
  LIQUIDATED = '8',
  REJECTED = '9',
  AWAITING_MILESTONE_APPLICATION = '10',
}

export enum StakingType {
  STAKER_LVL_1 = '0',
  STAKER_LVL_2 = '1',
  STAKER_LVL_3_OR_DAO_MEMBER = '2',
  DAO_DELEGATOR = '3',
}
