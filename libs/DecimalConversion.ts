import { ethers } from "ethers";
import { DecimalConversionError } from "../errors";
export class DecimalConversion {
  hlTokenDecimals: bigint;
  arbitrumTokenDecimals: bigint;

  constructor(hlTokenDecimals: bigint, arbitrumTokenDecimals: bigint) {
    if (hlTokenDecimals > arbitrumTokenDecimals) {
      throw new DecimalConversionError(
        `HL token decimals (${hlTokenDecimals}) must be strictly smaller or equal to Arbitrum token decimals (${arbitrumTokenDecimals}).`
      );
    }
    this.hlTokenDecimals = hlTokenDecimals;
    this.arbitrumTokenDecimals = arbitrumTokenDecimals;
  }

  convertToHlToken(arbitrumAmount: bigint): string {
    const HLWeiAmount =
      arbitrumAmount /
      10n ** BigInt(this.arbitrumTokenDecimals - this.hlTokenDecimals);
    return ethers.formatUnits(HLWeiAmount, this.hlTokenDecimals);
  }
}
