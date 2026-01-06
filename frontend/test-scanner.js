// Quick test to verify price fetching works
const { ethers } = require('ethers');

const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)"
];

const CHAINS = {
  base: {
    rpc: 'https://mainnet.base.org',
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    }
  },
  arbitrum: {
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    }
  }
};

async function testPrices() {
  console.log('🔍 Testing price fetching...\n');
  
  for (const [chainName, config] of Object.entries(CHAINS)) {
    console.log(`\n📊 ${chainName.toUpperCase()}`);
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const quoter = new ethers.Contract(config.quoter, QUOTER_ABI, provider);
    
    try {
      const amountIn = ethers.parseUnits('1', 18); // 1 WETH
      const amountOut = await quoter.quoteExactInputSingle.staticCall(
        config.tokens.WETH,
        config.tokens.DAI,
        3000,
        amountIn,
        0
      );
      
      const price = parseFloat(ethers.formatUnits(amountOut, 18));
      console.log(`  WETH/DAI: ${price.toFixed(2)} DAI`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Test complete!');
}

testPrices().catch(console.error);
