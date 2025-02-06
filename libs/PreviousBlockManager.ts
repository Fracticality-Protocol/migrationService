import IORedis from "ioredis";
import { env } from "../env";
export class PreviousBlockManager {
  private redisConnection: IORedis | null = null;
  private safetyCushionNumberOfBlocks: bigint;
  private getCurrentBlock: () => Promise<bigint>;
  constructor(
    redisConnection: IORedis,
    safetyCushionNumberOfBlocks: bigint,
    getCurrentBlock: () => Promise<bigint>
  ) {
    this.redisConnection = redisConnection;
    this.safetyCushionNumberOfBlocks = safetyCushionNumberOfBlocks;
    this.getCurrentBlock = getCurrentBlock;
  }

  //Returns the block number of the last scan, or the current block number minus the number of blocks back that corresponds to the scan period, as a start.
  async getFromBlockForScan() {
    if (!this.redisConnection) {
      throw new Error("Redis connection is not initialized");
    }
    const blockNumber = await this.redisConnection.get("lastScanBlockNumber");
    if (!blockNumber) {
      return BigInt(env.BLOCK_START_NUMBER);
    } else {
      return BigInt(blockNumber) - this.safetyCushionNumberOfBlocks; //Add safety cushion to the block number, so we don't miss any blocks, repeated events can be ignored
    }
  }

  async setFromBlockForScanToCurrentBlock(): Promise<bigint> {
    if (!this.redisConnection) {
      throw new Error("Redis connection is not initialized");
    }
    const currentBlockNumber = await this.getCurrentBlock();
    await this.redisConnection.set(
      "lastScanBlockNumber",
      currentBlockNumber.toString()
    );
    return currentBlockNumber;
  }
}
