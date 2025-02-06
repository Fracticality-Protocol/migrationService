import getSecret from "./SecretManager";
import { env } from "../env";

export class PrivateKeyManager {
  private privateKey: string | null = null;
  async init() {
    const secret = await getSecret();
    if (secret) {
      this.privateKey = JSON.parse(secret).HL_PRIVATE_KEY;
      console.log("private key set from secret manager");
    } else if (env.PRIVATE_KEY) {
      this.privateKey = env.PRIVATE_KEY;
      console.log("private key set from env var");
    }
  }
  getPrivateKey() {
    if (!this.privateKey) {
      throw new Error("Private key not set");
    }
    return this.privateKey;
  }
}
