import { env } from "../env";
import IORedis from "ioredis";
import { RedisError } from "../errors";

export class RedisOperations {
    private redisConnection: IORedis | null = null;


    async initialize() {
        this.redisConnection = await this.initRedisConnection();
    }


    async initRedisConnection() {
        return new IORedis(env.REDIS_CONNECTION_STRING, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: env.REDIS_USE_TLS
                ? {
                    rejectUnauthorized: false,
                }
                : undefined,
        });
    }

    async shouldRunAccordingToStopRunningFlag(): Promise<boolean> {
        if (!this.redisConnection) {
            return false;
        }
        let stopRunningFlag = null;
        try {
            stopRunningFlag = await this.redisConnection.get("stopRunning");
        } catch (error) {
            return false;
        }
        if (stopRunningFlag==="true") {
            return false;
        }
        return true;
    }


    async getLastScanBlockNumber(): Promise<bigint|null> {
        if (!this.redisConnection) {
            return null;
        }
        const lastScanBlockNumber = await this.redisConnection.get("lastScanBlockNumber");
        if(!lastScanBlockNumber) {
            return null;
        }
        return BigInt(lastScanBlockNumber);
    }

    async setLastScanBlockNumber(blockNumber: bigint) {
        if (!this.redisConnection) {
            throw new RedisError("Redis connection is not initialized");
        }
        try {
            await this.redisConnection.set("lastScanBlockNumber", blockNumber.toString());
        } catch (error) {
            throw new RedisError("Error setting lastScanBlockNumber in redis");
        }
    }
    async setStopRunningFlag() {
        if (!this.redisConnection) {
            return;
        }
        await this.redisConnection.set("stopRunning", "true");
    }

}