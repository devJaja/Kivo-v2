import { ethers } from "ethers";
import { CHAINS, TOKENS } from '../config';

const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)"
];

// Correct QuoterV2 addresses
const QUOTER_ADDRESSES: Record<string, string> = {
  'base': '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  'arbitrum': '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  'optimism': '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  'polygon': '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  'avalanche': '0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F',
};

class FastDEXReader {
  private providers: Map<string, ethers.JsonRpcProvider>;
  private quoters: Map<string, ethers.Contract>;
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_TTL = 3000; // 3 seconds

  constructor() {
    this.providers = new Map();
    this.quoters = new Map();
    this.priceCache = new Map();
    
    Object.keys(CHAINS).forEach((chainKey) => {
      const chain = CHAINS[chainKey as keyof typeof CHAINS];
      const provider = new ethers.JsonRpcProvider(chain.rpc, undefined, {
        staticNetwork: true,
        batchMaxCount: 100,
      });
      this.providers.set(chain.name, provider);
      
      const quoterAddress = QUOTER_ADDRESSES[chain.name];
      if (quoterAddress) {
        this.quoters.set(chain.name, new ethers.Contract(quoterAddress, QUOTER_ABI, provider));
      }
    });
  }

  async getPrice(
    chainName: keyof typeof CHAINS,
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amountIn: number = 1
  ): Promise<number | null> {
    const cacheKey = `${chainName}_${tokenInSymbol}_${tokenOutSymbol}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    const quoter = this.quoters.get(chainName);
    const chainTokens = TOKENS[chainName];

    if (!quoter || !chainTokens) return null;

    const tokenIn = chainTokens[tokenInSymbol as keyof typeof chainTokens];
    const tokenOut = chainTokens[tokenOutSymbol as keyof typeof chainTokens];

    if (!tokenIn || !tokenOut) return null;

    try {
      const tokenInDecimals = tokenInSymbol === 'USDC' || tokenInSymbol === 'USDT' ? 6 : 18;
      const tokenOutDecimals = tokenOutSymbol === 'USDC' || tokenOutSymbol === 'USDT' ? 6 : 18;
      const amountInWei = ethers.parseUnits(amountIn.toString(), tokenInDecimals);

      const amountOutWei = await quoter.quoteExactInputSingle.staticCall(
        tokenIn,
        tokenOut,
        3000,
        amountInWei,
        0
      );

      const price = parseFloat(ethers.formatUnits(amountOutWei, tokenOutDecimals));
      
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch {
      return null;
    }
  }

  clearCache() {
    this.priceCache.clear();
  }
}

export const fastDexReader = new FastDEXReader();
