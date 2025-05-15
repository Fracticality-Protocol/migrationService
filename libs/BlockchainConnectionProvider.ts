import { Address, createPublicClient, decodeEventLog, http, getContract } from 'viem'
import { arbitrum, arbitrumSepolia } from 'viem/chains'
import { env } from '../env'
import abi from '../contracts/FractalityTokenMigration.sol.json'
import { MigrationRegisteredEvent } from '../interfaces'
import { AlchemyScanError, BlockchainConnectionError } from '../errors'
interface BlockchainConnectionProviderOptions {
  providerUrl: string
  y2kTokenMigrationAddress: Address
  frctRTokenMigrationAddress: Address
}

const ERC20Abi = [
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'totalSupply',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  }
]

export class BlockchainConnectionProvider {
  public lastAssetProcessedBlock: bigint = BigInt(0)
  public lastShareProcessedBlock: bigint = BigInt(0)
  public y2kTokenMigrationAddress: Address
  public frctRTokenMigrationAddress: Address

  public _viemClient: ReturnType<typeof createPublicClient>

  constructor(opts: BlockchainConnectionProviderOptions) {
    this.y2kTokenMigrationAddress = opts.y2kTokenMigrationAddress
    this.frctRTokenMigrationAddress = opts.frctRTokenMigrationAddress
    this._viemClient = this._init(opts)
    console.log('Connected to blockchain', this._viemClient.chain!.name)
  }

  private _init = (opts: BlockchainConnectionProviderOptions) => {
    return createPublicClient({
      chain: env.BLOCKCHAIN_ENVIRONMENT === 'test' ? arbitrumSepolia : arbitrum,
      transport: http(opts.providerUrl)
    })
  }

  public async getCurrentBlockNumber(): Promise<bigint> {
    try {
      return this._viemClient.getBlockNumber()
    } catch (error) {
      throw new BlockchainConnectionError('Error getting current block number: ' + error)
    }
  }

  public async getArbitrumTokenDecimals(): Promise<bigint> {
    // Start Generation Here
    const y2kMigrationContract = getContract({
      address: this.y2kTokenMigrationAddress,
      abi: abi.abi,
      client: { public: this._viemClient }
    })

    const frctRMigrationContract = getContract({
      address: this.frctRTokenMigrationAddress,
      abi: abi.abi,
      client: { public: this._viemClient }
    })
    const y2kToken = await y2kMigrationContract.read.token()
    const frctRToken = await frctRMigrationContract.read.token()

    const y2kErc20 = getContract({
      address: y2kToken as Address,
      abi: ERC20Abi,
      client: { public: this._viemClient }
    })

    const frctRErc20 = getContract({
      address: frctRToken as Address,
      abi: ERC20Abi,
      client: { public: this._viemClient }
    })

    const y2kDecimals = (await y2kErc20.read.decimals()) as bigint
    const frctRDecimals = (await frctRErc20.read.decimals()) as bigint

    if (y2kDecimals !== frctRDecimals) {
      throw new Error('Fatal error:Y2K and FRCT-R decimals do not match')
    }

    return y2kDecimals
  }

  public async scanMigrations(
    migrationAddress: Address,
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<MigrationRegisteredEvent[]> {
    try {
      if (fromBlock >= toBlock) {
        throw new Error('from block must be before toBlock')
      }

      console.log(`Getting blocks from ${fromBlock} to ${toBlock}`)

      // NOTE: Alchemy block limit
      const CHUNK_SIZE = BigInt(500)

      const decodedLogs: MigrationRegisteredEvent[] = []

      let currentFromBlock = fromBlock

      while (currentFromBlock <= toBlock) {
        const chunkToBlock =
          currentFromBlock + CHUNK_SIZE > toBlock
            ? toBlock
            : currentFromBlock + CHUNK_SIZE - BigInt(1)

        console.log(`Fetching chunk from ${currentFromBlock} to ${chunkToBlock}`)

        const logs = await this._viemClient.getContractEvents({
          address: migrationAddress,
          abi: abi.abi,
          eventName: 'MigrationRegistered',
          fromBlock: currentFromBlock,
          toBlock: chunkToBlock
        })

        logs.forEach((log) => {
          const decodedLog = decodeEventLog({
            abi: abi.abi,
            data: log.data,
            topics: log.topics,
            eventName: 'MigrationRegistered'
          })

          decodedLogs.push({
            migrationContractAddress: migrationAddress,
            eventName: decodedLog.eventName,
            transactionHash: log.transactionHash,
            caller: (decodedLog.args as any).caller as Address,
            migrationAddress: (decodedLog.args as any).migrationAddress as Address,
            amount: BigInt((decodedLog.args as any).amount as string)
          })
        })

        currentFromBlock = chunkToBlock + BigInt(1)
      }

      return decodedLogs
    } catch (error) {
      throw new AlchemyScanError(`Error scanning migrations in block range ${fromBlock} to ${toBlock}: ${error}`)
    }
  }
}
