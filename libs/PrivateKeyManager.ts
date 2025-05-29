import getSecret from "./SecretManager";
import { env } from "../env";
import { PrivateKeyManagerInitError } from "../errors";

export class PrivateKeyManager {
  private privateKey: string | null = null;
  async init() {
    try {
      const secret = await getSecret();
      if (secret) {
        this.privateKey = JSON.parse(secret).HL_PRIVATE_KEY;
      console.log("private key set from secret manager");
    } else if (env.PRIVATE_KEY) {
        this.privateKey = env.PRIVATE_KEY;
        console.log("private key set from env var");
      }
    } catch (error) {
      throw new PrivateKeyManagerInitError("Error initializing private key manager: " + error);
    }
  }
  getPrivateKey() {
    if (!this.privateKey) {
      throw new Error("Private key not set");
    }
    return this.privateKey;
  }
}
