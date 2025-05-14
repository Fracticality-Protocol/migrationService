import IORedis from "ioredis";
import { env } from "../env";
import { RedisOperations } from "../redisOperations/redisOperations";
export class PreviousBlockManager {
  private redisOperations: RedisOperations;
  private safetyCushionNumberOfBlocks: bigint;
  private getCurrentBlock: () => Promise<bigint>;
  constructor(
    redisOperations: RedisOperations,
    safetyCushionNumberOfBlocks: bigint,
    getCurrentBlock: () => Promise<bigint>
  ) {
    this.redisOperations = redisOperations;
    this.safetyCushionNumberOfBlocks = safetyCushionNumberOfBlocks;
    this.getCurrentBlock = getCurrentBlock;
  }

  //Returns the block number of the last scan, or the current block number minus the number of blocks back that corresponds to the scan period, as a start.
  async getFromBlockForScan() {
    const blockNumber = await this.redisOperations.getLastScanBlockNumber();
    if (!blockNumber) {
      return BigInt(env.BLOCK_START_NUMBER);
    } else {
      return blockNumber - this.safetyCushionNumberOfBlocks; //Add safety cushion to the block number, so we don't miss any blocks, repeated events can be ignored
    }
  }

  async setFromBlockForScanToCurrentBlock(): Promise<bigint> {
    const currentBlockNumber = await this.getCurrentBlock();
    await this.redisOperations.setLastScanBlockNumber(currentBlockNumber);
    return currentBlockNumber;
  }
}
