import { PrivateKeyManager } from "./libs/PrivateKeyManager";
import IORedis from "ioredis";
const privateKeyManager = new PrivateKeyManager();
import { env } from "./env";
import { BlockchainConnectionProvider } from "./libs/BlockchainConnectionProvider";
import { Address } from "viem";
import {
  addFractalityTokenMigrations,
  getUnmigratedFractalityTokenMigrations,
  finalizeHlMigrations,
  setHLMigrationStatus,
  TokenMigration,
} from "./database";
import {
  HLMigration,
  MigrationRegisteredEvent,
  MigrationStatus,
} from "./interfaces";
import { initializeDatabaseConnection } from "./database";
import cron from "node-cron";
import { PreviousBlockManager } from "./libs/PreviousBlockManager";
import { HyperliquidManager } from "./libs/HyperliquidManager";
async function main() {
  await privateKeyManager.init();
  await initializeDatabaseConnection();

  const redisConnection = await initRedisConnection();

  const hlManager = new HyperliquidManager(
    true,
    true,
    privateKeyManager.getPrivateKey()
  );

  const blockchainConnectionProvider = new BlockchainConnectionProvider({
    providerUrl: env.PROVIDER_URL,
    y2kTokenMigrationAddress: env.Y2K_TOKEN_MIGRATION_ADDRESS as Address,
    frctRTokenMigrationAddress: env.FRCT_R_MIGRATION_ADDRESS as Address,
  });

  await hlManager.init(
    await blockchainConnectionProvider.getArbitrumTokenDecimals()
  );

  const blockManager = new PreviousBlockManager(
    redisConnection,
    BigInt(env.SAFETY_CUSHION_NUMBER_OF_BLOCKS),
    () => blockchainConnectionProvider.getCurrentBlockNumber()
  );

  console.log("starting cron job for migrations, running every 5 minutes");
  cron.schedule("* * * * *", async () => {
    const fromBlock = await blockManager.getFromBlockForScan();
    const toBlock = await blockManager.setFromBlockForScanToCurrentBlock();
    console.log(
      `looking for migrations from block ${fromBlock} to block ${toBlock}`
    );

    const y2kMigrations = await blockchainConnectionProvider.scanMigrations(
      env.Y2K_TOKEN_MIGRATION_ADDRESS as Address,
      fromBlock,
      toBlock
    );
    const frctRMigrations = await blockchainConnectionProvider.scanMigrations(
      env.FRCT_R_MIGRATION_ADDRESS as Address,
      fromBlock,
      toBlock
    );
    await addMigrationsToDatabase([...y2kMigrations, ...frctRMigrations]);

    //get migrations that still have not been sent to hyperliquid
    const unmigratedMigrations: TokenMigration[] =
      await getUnmigratedFractalityTokenMigrations();

    //calcualate the amount of tokens to send to hyperliquid
    const hlMigrations = await prepForHLMigration(
      hlManager,
      unmigratedMigrations
    );
    console.log("hlMigrations", hlMigrations);

    const { successes, failures } = await hlManager.sendHLMigrations(
      hlMigrations
    );
    console.log("successes", successes);
    console.log("failures", failures);

    try {
      await finalizeHlMigrations(successes);
    } catch (error) {
      console.error("FATAL ERROR: Error finalizing HL migrations", error);
    }

    console.log("done");
  });
}

async function prepForHLMigration(
  hlManager: HyperliquidManager,
  unmigratedMigrations: TokenMigration[]
): Promise<HLMigration[]> {
  const hlMigrations: HLMigration[] = [];
  for (const unmigratedMigration of unmigratedMigrations) {
    if (unmigratedMigration.amount && unmigratedMigration.migrationAddress) {
      const arbitrumAmount = BigInt(unmigratedMigration.amount);
      const hlAmount =
        hlManager.decimalConversion!.convertToHlToken(arbitrumAmount);
      hlMigrations.push({
        originalTransactionHash: unmigratedMigration.transactionHash,
        hlTokenAmount: hlAmount,
        sendToAddress: unmigratedMigration.migrationAddress,
      });
    } else {
      console.error(
        `migration with hash ${unmigratedMigration.transactionHash} has no amount or no migration address`
      );
    }
  }
  return hlMigrations;
}

async function initRedisConnection() {
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

async function addMigrationsToDatabase(migrations: MigrationRegisteredEvent[]) {
  try {
    const result = await addFractalityTokenMigrations(migrations); //TODO: make this batch
    console.log(
      `Inserted ${result.newMigrations.length} new migrations and found ${result.existingTxs.length} existing migrations`
    );
    console.info(
      `existing migrations that already exist in the database`,
      result.existingTxs
    );
  } catch (e) {
    console.error("Error adding migration to database", e);
  }
}

main();
