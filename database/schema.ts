import { env } from '../env'

import { integer, text, boolean, pgSchema } from 'drizzle-orm/pg-core'

export const schema = pgSchema(env.DB_SCHEMA || 'test')

export const fractalityTokenMigrations = schema.table('fractality_token_migrations', {
  transactionHash: text('transaction_hash').primaryKey(),
  migrationContractAddress: text('migration_contract_address'),
  eventName: text('event_name'),
  caller: text('caller'),
  migrationAddress: text('migration_address'),
  amount: text('amount'),
  foundAt: text('found_at'),
  status: text('status'),
  migratedAt: text('migrated_at'),
  migratedAmount: text('migrated_amount')
})
