const { Hyperliquid } = require('hyperliquid')
import { setHLMigrationStatus } from '../database'
import { env } from '../env'
import { HyperliquidError, HyperliquidInitError, HyperLiquidInsufficientGasTokenError, HyperLiquidInsufficientHlTokenError } from '../errors'
import { HLMigration, MigrationStatus } from '../interfaces'
import { DecimalConversion } from './DecimalConversion'

export class HyperliquidManager {
  private hlSdk: any
  public hlTokenAddress: string
  public tokenInfo: any
  public decimalConversion: DecimalConversion | null = null

  constructor(enableWs: boolean, testnet: boolean, privateKey: string) {
    this.hlSdk = new Hyperliquid({
      enableWs, // boolean (OPTIONAL) - Enable/disable WebSocket functionality, defaults to true
      privateKey: privateKey,
      testnet,
      walletAddress: env.PUBLIC_ADDRESS
    })
    this.hlTokenAddress = env.TOKEN_ADDRESS
  }

  async init(arbitrumTokenDecimals: bigint) {
    try {
      await this.hlSdk.connect()
      this.tokenInfo = await this.getTokenInfo(env.TOKEN_ADDRESS)
      console.info(
      `Using HL token with name ${this.tokenInfo.name} wei decimals ${this.tokenInfo.weiDecimals}`
    )
      this.decimalConversion = new DecimalConversion(
        this.tokenInfo.weiDecimals,
        arbitrumTokenDecimals
      )
    } catch (error) {
      throw new HyperliquidInitError('Error initializing hyperliquid manager: ' + error)
    }
  }

  async getUserTokenBalances(userAddress: string) {
    try {
      const balances = await this.hlSdk.info.spot.getSpotClearinghouseState(userAddress, false)
      return balances
    } catch (error) {
      throw new HyperliquidError('Error getting user token balances: ' + error)
    }
  }

  getTokenDecimals() {
    return this.tokenInfo.weiDecimals
  }

  async getTokenInfo(tokenAddress: string) {
    try {
      return this.hlSdk.info.spot.getTokenDetails(tokenAddress)
    } catch (error) {
      throw new HyperliquidError('Error getting token info: ' + error)
    }
  }

  //NOTE: the amount here is NOT in wei. It is in decimal representation.
  //TODO: rate limit -> 1200 requests per minute
  async sendToken(amount: string, destination: string) {
    const result = await this.hlSdk.exchange.spotTransfer(
      destination,
      this.tokenInfo.name + ':' + this.hlTokenAddress,
      amount
    )
    if (result.status === 'ok') {
      console.info('Transfer successful')
    } else {
      console.info('Transfer failed', result.response)

      if(result.response.toLowerCase().includes('insufficient balance for token transfer')) {
        throw new HyperLiquidInsufficientHlTokenError('NEED TO TOP UP HL TOKEN BALANCE - ' + result.response)
      }

      if(result.response.toLowerCase().includes('Insufficient USDC balance for token transfer gas')) {
        throw new HyperLiquidInsufficientGasTokenError('NEED TO TOP UP USDC GAS TOKEN BALANCE - ' + result.response)
      }

      throw new HyperliquidError('Transfer failed for a reason not related to hl or gas balance - ' + result.response)
    }
  }
  //4000 migrations will take aroud 1000$ USDC!
  async sendHLMigrations(hlMigrations: HLMigration[]) {
    let successes: HLMigration[] = []
    let failures: HLMigration[] = []
    for (const migration of hlMigrations) {
      if (Number(migration.hlTokenAmount) == 0) {
        console.info(
          `migration with hash ${migration.originalTransactionHash} has a HL amount of 0 due to truncation, skipping sending.`
        )
        successes.push(migration)
        continue
      }
      try {
        await this.sendToken(migration.hlTokenAmount, migration.sendToAddress)
        successes.push(migration)
      } catch (error) {
        console.error(
          `Error sending token to hyperliquid for migration ${migration.originalTransactionHash}`,
          error
        )
        await setHLMigrationStatus(
          migration.originalTransactionHash,
          MigrationStatus.ERRORED_IN_SENDING_TO_HL
        )
        failures.push(migration)
      }
    }
    return { successes, failures }
  }
}
