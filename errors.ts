import { HLMigration } from "./interfaces";

export class FatalFinalizationError extends Error {
    failedMigrations: HLMigration[];
    constructor(message: string, failedMigrations: HLMigration[]) {
      super(message);
      this.name = "FatalError";
      this.failedMigrations = failedMigrations;
    }
  }

export class RedisError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RedisError";
    }
  }

  export class AlchemyScanError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AlchemyScanError";
    }
  }

export class DecimalConversionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DecimalConversionError";
    }
  }


  export class HyperliquidError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "HyperliquidError";
    }
  }

  export class HyperLiquidInsufficientHlTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "HyperLiquidInsufficientHlTokenError";
    }
  }

  export class HyperLiquidInsufficientGasTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "HyperLiquidInsufficientGasTokenError";
    }
  }

  export class BlockchainConnectionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "BlockchainConnectionError";
    }
  }

  export class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  }

  export class MigrationPrepError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "MigrationPrepError";
    }
  }
  