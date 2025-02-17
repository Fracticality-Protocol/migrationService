import { type Context, type Handler } from 'aws-lambda'

import { main } from './migrationService'

export const handler: Handler<void, void> = async (
  event: void,
  context: Context
): Promise<void> => {
  try {
    await main(false)
  } catch (error) {
    console.error('Error With Migration Service:', error)
    throw error
  }
}
