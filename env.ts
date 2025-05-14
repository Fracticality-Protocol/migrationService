import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const envSchema = z.object({
  PRIVATE_KEY: z.string(),
  PUBLIC_ADDRESS: z.string(),
  MNEMONIC_SECRET_ARN: z.string().optional(),
  AWS_REGION: z.string().optional(),
  TESTNET: z.coerce.boolean(),
  TOKEN_ADDRESS: z.string(),
  PROVIDER_URL: z.string(),
  Y2K_TOKEN_MIGRATION_ADDRESS: z.string(),
  FRCT_R_MIGRATION_ADDRESS: z.string(),
  NODE_ENV: z.string().optional(),
  DB_NAME: z.string(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SCHEMA: z.string().optional(),
  BLOCKCHAIN_ENVIRONMENT: z.string(),
  BLOCK_START_NUMBER: z.string(),
  SAFETY_CUSHION_NUMBER_OF_BLOCKS: z.coerce.number(),
  REDIS_CONNECTION_STRING: z.string(),
  REDIS_USE_TLS: z.preprocess((str) => str === 'true', z.boolean())
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message
  }))

  console.error('Environment variable validation failed:', formattedErrors)
  throw new Error('Invalid environment variables.')
}

export type BotEnv = z.infer<typeof envSchema>

export const env = parsedEnv.data
