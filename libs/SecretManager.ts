import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { env } from '../env'

async function getSecret(): Promise<string | null> {
  const client = new SecretsManagerClient({
    region: env.AWS_REGION
  })

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: env.MNEMONIC_SECRET_ARN,
        VersionStage: 'AWSCURRENT' // VersionStage defaults to AWSCURRENT if unspecified
      })
    )

    if (!response.SecretString) {
      return null
    }

    return response.SecretString
  } catch (error) {
    console.error('Error retrieving secret:', error)
    return null
  }
}

export default getSecret
