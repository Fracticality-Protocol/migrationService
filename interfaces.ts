import { Address } from "viem";

export interface MigrationRegisteredEvent {
  transactionHash: Address;
  migrationContractAddress: Address;
  eventName: "MigrationRegistered";
  caller: Address;
  migrationAddress: Address;
  amount: bigint;
}

export interface HLMigration {
  originalTransactionHash: string;
  hlTokenAmount: string;
  sendToAddress: string;
}

export enum MigrationStatus {
  FOUND_ON_ARBITRUM = "FOUND_ON_ARBITRUM",
  PREPPED_FOR_HL = "PREPPED_FOR_HL",
  SENT_TO_HL = "SENT_TO_HL",
  ERRORED_IN_SENDING_TO_HL = "ERRORED_IN_SENDING_TO_HL",
}
