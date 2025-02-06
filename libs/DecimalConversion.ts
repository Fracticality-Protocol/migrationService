import { ethers } from "ethers";
export class DecimalConversion {
  hlTokenDecimals: bigint;
  arbitrumTokenDecimals: bigint;

  constructor(hlTokenDecimals: bigint, arbitrumTokenDecimals: bigint) {
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
