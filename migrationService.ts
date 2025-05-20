import { PrivateKeyManager } from './libs/PrivateKeyManager'
const privateKeyManager = new PrivateKeyManager()
import { env } from './env'
import { BlockchainConnectionProvider } from './libs/BlockchainConnectionProvider'
import { Address } from 'viem'
import {
  filterAndaddNewFractalityTokenMigrations,
  getUnmigratedFractalityTokenMigrations,
  finalizeHlMigrations,
  setHLMigrationStatus,
  TokenMigration
} from './database'
import { HLMigration, MigrationRegisteredEvent, MigrationStatus } from './interfaces'
import { initializeDatabaseConnection } from './database'
import cron from 'node-cron'
import { PreviousBlockManager } from './libs/PreviousBlockManager'
import { HyperliquidManager } from './libs/HyperliquidManager'
import { FatalFinalizationError, MigrationPrepError, RedisError } from './errors'
import { RedisOperations } from './redisOperations/redisOperations'
import { Slack } from './libs/Slack'

export async function main(runWithCron: boolean) {
  if (env.SLACK_TOKEN) {
    Slack.initialize(env.SLACK_TOKEN!, env.SLACK_CHANNEL_ID!)
  }

  await privateKeyManager.init()
  await initializeDatabaseConnection()

  const redisOperations = new RedisOperations()
  await redisOperations.initialize()

  const hlManager = new HyperliquidManager(true, true, privateKeyManager.getPrivateKey())

  const blockchainConnectionProvider = new BlockchainConnectionProvider({
    providerUrl: env.PROVIDER_URL,
    y2kTokenMigrationAddress: env.Y2K_TOKEN_MIGRATION_ADDRESS as Address,
    frctRTokenMigrationAddress: env.FRCT_R_MIGRATION_ADDRESS as Address
  })

  await hlManager.init(await blockchainConnectionProvider.getArbitrumTokenDecimals())

  const blockManager = new PreviousBlockManager(
    redisOperations,
    BigInt(env.SAFETY_CUSHION_NUMBER_OF_BLOCKS),
    () => blockchainConnectionProvider.getCurrentBlockNumber()
  )

  if (runWithCron) {
    console.info('starting cron job for migrations, running every 5 minutes')
    const scheduledTask = cron.schedule('* * * * *', async () => {
      try {
        await coreMigrationService(blockManager, blockchainConnectionProvider, hlManager)
      } catch (error) {
        if (error instanceof FatalFinalizationError) {
          scheduledTask.stop()
        } else {
          console.info('Error in core migration service, this run will be skipped', error)
        }
      }
    })
  } else {
    try {
      if (await redisOperations.shouldRunAccordingToStopRunningFlag()) {
        await coreMigrationService(blockManager, blockchainConnectionProvider, hlManager)
      } else {
        console.info('stopRunning flag is set, not running core migration service')
        return
      }
    } catch (error) {
      if (error instanceof FatalFinalizationError) {
        await redisOperations.setStopRunningFlag()
      } else {
        console.info('Error in core migration service, this run will be skipped', error)
      }
      throw error
    }
  }
}

export async function coreMigrationService(
  blockManager: PreviousBlockManager,
  blockchainConnectionProvider: BlockchainConnectionProvider,
  hlManager: HyperliquidManager
) {
  //This, if fails will do a scan from the start block, not a big dea.
  const fromBlock = await blockManager.getFromBlockForScan()

  //This gets the current block and sets it in redis. If fails, will bubble up and this run will be skipped.
  const toBlock = await blockManager.setFromBlockForScanToCurrentBlock()
  console.info(`looking for migrations from block ${fromBlock} to block ${toBlock}`)

  //Gets logs from the blockchain. If fails, will bubble up and this run will be skipped.
  const y2kMigrations = await blockchainConnectionProvider.scanMigrations(
    env.Y2K_TOKEN_MIGRATION_ADDRESS as Address,
    fromBlock,
    toBlock
  )
  const frctRMigrations = await blockchainConnectionProvider.scanMigrations(
    env.FRCT_R_MIGRATION_ADDRESS as Address,
    fromBlock,
    toBlock
  )
  //This is atomic, if it fails, nothing was written and we can try again next time.
  await addMigrationsToDatabase([...y2kMigrations, ...frctRMigrations])

  //get migrations that still have not been sent to hyperliquid
  //This includes the ones we added above... as well as those that were not migrated for some reason.
  //If this fails, we will skip this run and try again next time.
  const unmigratedMigrations: TokenMigration[] = await getUnmigratedFractalityTokenMigrations()

  //calcualate the amount of tokens to send to hyperliquid
  //If all the migrations are not able to be prepped, we will skip this run and try again next time.
  //However, I don't see this failing as it's just doing some math.
  const hlMigrations = await prepForHLMigration(hlManager, unmigratedMigrations)
  console.info('hlMigrations', hlMigrations)

  //This fails gracefully, the ones we could not send are in the faulures array.
  const { successes, failures } = await hlManager.sendHLMigrations(hlMigrations)
  console.info('successes', successes)
  console.info('failures', failures)

  let finalizationMaxRetries = 3
  let migrationsToFinalize = successes
  for (const attemptNumber of Array(finalizationMaxRetries).keys()) {
    const finalizationResults = await finalizeHlMigrations(migrationsToFinalize)
    if (finalizationResults.failures.length === 0) {
      break
    }
    migrationsToFinalize = finalizationResults.failures
    if (attemptNumber === finalizationMaxRetries - 1) {
      throw new FatalFinalizationError(
        'FATAL ERROR: Error finalizing HL migrations. The following migration need to manually be marked as sent to HL',
        finalizationResults.failures
      )
    }
  }
}

//Maybe I can add some in success and failure buckets.
async function prepForHLMigration(
  hlManager: HyperliquidManager,
  unmigratedMigrations: TokenMigration[]
): Promise<HLMigration[]> {
  try {
    const hlMigrations: HLMigration[] = []
    for (const unmigratedMigration of unmigratedMigrations) {
      if (unmigratedMigration.amount && unmigratedMigration.migrationAddress) {
        const arbitrumAmount = BigInt(unmigratedMigration.amount)
        const hlAmount = hlManager.decimalConversion!.convertToHlToken(arbitrumAmount)
        hlMigrations.push({
          originalTransactionHash: unmigratedMigration.transactionHash,
          hlTokenAmount: hlAmount,
          sendToAddress: unmigratedMigration.migrationAddress
        })
      } else {
        console.error(
          `migration with hash ${unmigratedMigration.transactionHash} has no amount or no migration address`
        )
      }
    }
    return hlMigrations
  } catch (error) {
    throw new MigrationPrepError('Error preparing for HL migration: ' + error)
  }
}

async function addMigrationsToDatabase(migrations: MigrationRegisteredEvent[]) {
  const result = await filterAndaddNewFractalityTokenMigrations(migrations) //TODO: make this batch
  console.info(
    `Inserted ${result.newMigrations.length} new migrations and found ${result.existingTxs.length} existing migrations`
  )
  console.info(`existing migrations that already exist in the database`, result.existingTxs)
}
