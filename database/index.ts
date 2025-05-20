import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, asc, and, gt, sql, inArray, not } from 'drizzle-orm'

import * as schema from './schema'
import { env } from '../env'
import { HLMigration, MigrationRegisteredEvent, MigrationStatus } from '../interfaces'
import { DatabaseError } from '../errors'

let db: PostgresJsDatabase<typeof schema> | null = null

export async function initializeDatabaseConnection(): Promise<PostgresJsDatabase<typeof schema>> {
  if (db) {
    return db
  }
  let connection: postgres.Sql<{}> | null = null
  if (env.NODE_ENV === 'local') {
    //local defaults for a local db instance
    console.log('connected to local database')
    connection = postgres({
      database: env.DB_NAME
    })
  } else {
    console.log('connected to ', env.DB_HOST)
    connection = postgres({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: 'prefer'
    })
  }
  db = drizzle(connection, { schema })
  console.log('database connection initialized')
  return db
}

export async function filterAndaddNewFractalityTokenMigrations(
  migrations: MigrationRegisteredEvent[]
): Promise<{
  newMigrations: MigrationRegisteredEvent[]
  existingTxs: { txHash: string }[]
}> {
  if (!db) {
    throw new DatabaseError('Database not initialized')
  }
  // Get all transaction hashes from the incoming migrations
  const incomingTxHashes = migrations.map((m) => m.transactionHash)
  let existingTxs: { txHash: string }[] = []
  try {
    // Check which transactions already exist in the database
    existingTxs = await db
      .select({ txHash: schema.fractalityTokenMigrations.transactionHash })
      .from(schema.fractalityTokenMigrations)
      .where(inArray(schema.fractalityTokenMigrations.transactionHash, incomingTxHashes))
  } catch (error) {
    throw new DatabaseError('Error fetching existing migrations from database: ' + error)
  }

  // Filter out migrations that already exist
  const newMigrations = migrations.filter(
    (migration) => !existingTxs.some((tx) => tx.txHash === migration.transactionHash)
  )

  // If there are new migrations, insert them
  if (newMigrations.length > 0) {
    try {
      await db.insert(schema.fractalityTokenMigrations).values(
        newMigrations.map((migration) => ({
          transactionHash: migration.transactionHash,
          migrationContractAddress: migration.migrationContractAddress,
          eventName: migration.eventName,
          caller: migration.caller,
          migrationAddress: migration.migrationAddress,
          amount: migration.amount.toString(),
          foundAt: new Date().toISOString(),
          status: MigrationStatus.FOUND_ON_ARBITRUM,
          migratedAt: null,
          migratedAmount: null
        }))
      )
    } catch (error) {
      throw new DatabaseError('Error inserting new migrations batch into database: ' + error)
    }
  }
  return { newMigrations: newMigrations, existingTxs: existingTxs }
}

export async function dbCleanup(): Promise<void> {
  try {
    console.log('Starting database cleanup...')

    if (db) {
      // Get the underlying postgres connection from drizzle
      const client = (db as any).session?.config?.connection
      if (client) {
        await client.end()
        console.log('Database connection closed')
      }
      db = null
    }

    console.log('Database cleanup completed')
  } catch (error) {
    console.error('Error during database cleanup:', error)
    throw error
  }
}

export async function getUnmigratedFractalityTokenMigrations(): Promise<TokenMigration[]> {
  if (!db) {
    throw new Error('Database not initialized')
  }
  try {
    const migrations = await db
      .select()
      .from(schema.fractalityTokenMigrations)
      .where(not(eq(schema.fractalityTokenMigrations.status, MigrationStatus.SENT_TO_HL)))
    return migrations
  } catch (error) {
    throw new DatabaseError('Error fetching unmigrated fractality token migrations: ' + error)
  }
}

export async function getAllFractalityTokenMigrations(): Promise<TokenMigration[]> {
  if (!db) {
    throw new Error('Database not initialized')
  }

  try {
    return await db.select().from(schema.fractalityTokenMigrations)
  } catch (error) {
    console.error('Error fetching fractality token migrations:', error)
    throw error
  }
}

export async function getFractalityTokenMigrationsByAddress(
  migrationAddress: string
): Promise<TokenMigration[]> {
  if (!db) {
    throw new Error('Database not initialized')
  }
  try {
    const migrations = await db
      .select()
      .from(schema.fractalityTokenMigrations)
      .where(eq(schema.fractalityTokenMigrations.migrationAddress, migrationAddress))

    return migrations
  } catch (error) {
    console.error('Error fetching migrations by address:', error)
    throw error
  }
}

export async function getFractalityTokenMigrationsByMigrationContractAddress(
  migrationContractAddress: string
): Promise<TokenMigration[]> {
  if (!db) {
    throw new Error('Database not initialized')
  }
  try {
    const migrations = await db
      .select()
      .from(schema.fractalityTokenMigrations)
      .where(
        eq(schema.fractalityTokenMigrations.migrationContractAddress, migrationContractAddress)
      )

    return migrations
  } catch (error) {
    console.error('Error fetching migrations by migration contract address:', error)
    throw error
  }
}

export async function setHLMigrationStatus(migrationHash: string, status: MigrationStatus) {
  try {
    if (!db) {
      throw new Error('Database not initialized')
    }
    await db
      .update(schema.fractalityTokenMigrations)
      .set({ status: status })
      .where(eq(schema.fractalityTokenMigrations.transactionHash, migrationHash))
  } catch (error) {
    console.error(`ERROR setting HL migration status. Error: ${error}`)
    throw error
  }
}

export async function finalizeHlMigrations(migrations: HLMigration[]) {
  const successes = []
  const failures = []
  if (!db) {
    throw new Error('Database not initialized')
  }

  for (const migration of migrations) {
    try {
      console.info(`Setting HL migration for ${migration.originalTransactionHash}`)
      await db
        .update(schema.fractalityTokenMigrations)
        .set({
          status: MigrationStatus.SENT_TO_HL,
          migratedAt: new Date().toISOString(),
          migratedAmount: migration.hlTokenAmount
        })
        .where(
          eq(schema.fractalityTokenMigrations.transactionHash, migration.originalTransactionHash)
        )
      successes.push(migration)
    } catch (error) {
      failures.push(migration)
      //THhis needs to shut down the service, as the next run could cause a double send.
      console.error(`ERROR updating HL ${migration} migrations. Error: ${error}`)
    }
  }
  return { successes, failures }
}

export type TokenMigration = typeof schema.fractalityTokenMigrations.$inferSelect
