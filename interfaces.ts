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
  FOUND_ON_ARBITRUM = "FOUND_ON_ARBITRUM", //Just found on arbitrum, not filtered.
  SENT_TO_HL = "SENT_TO_HL", //Sent to HL
  ERRORED_IN_SENDING_TO_HL = "ERRORED_IN_SENDING_TO_HL", //Errored in sending to HL
}
