# ⚡ Fast Arbitrage Scanner

## Overview
Ultra-fast arbitrage opportunity scanner optimized for speed and efficiency. Scans cross-chain price differences every 2 seconds.

## Key Optimizations

### 1. **Parallel Processing**
- All chains and tokens scanned simultaneously using `Promise.allSettled()`
- No sequential bottlenecks
- Typical scan time: 1-3 seconds

### 2. **Connection Pooling**
- Persistent RPC connections via `fastDexReader`
- Reused ethers.js providers with `staticNetwork: true`
- Batch RPC calls enabled (`batchMaxCount: 100`)

### 3. **Smart Caching**
- 3-second price cache to reduce redundant RPC calls
- Cache key: `${chain}_${tokenIn}_${tokenOut}`
- Automatic cache invalidation

### 4. **Optimized Filtering**
- Quick profit check (0.15% threshold) before expensive operations
- Only validates profitable opportunities with Across quotes
- Skips AI validation for speed (can be re-enabled if needed)

### 5. **Minimal State Updates**
- Deduplicates opportunities before state update
- Limits display to top 10 opportunities
- Efficient React re-renders

## Architecture

```
┌─────────────────────────────────────────┐
│  useFastArbitrageScanner Hook           │
│  ├─ 2-second scan interval              │
│  ├─ Parallel price fetching             │
│  └─ Opportunity validation               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  fastDexReader (Optimized)              │
│  ├─ Connection pooling                  │
│  ├─ Price caching (3s TTL)              │
│  └─ Batch RPC calls                     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Uniswap V3 Quoters (On-chain)          │
│  ├─ Base                                │
│  ├─ Arbitrum                            │
│  ├─ Optimism                            │
│  ├─ Polygon                             │
│  └─ Avalanche                           │
└─────────────────────────────────────────┘
```

## Scan Coverage

**Chains:** Base, Arbitrum, Optimism, Polygon, Avalanche
**Tokens:** WETH, USDC, DAI, USDT
**Routes:** All cross-chain combinations (20 routes per token)
**Total Checks:** ~60 price pairs per scan

## Performance Metrics

- **Scan Frequency:** Every 2 seconds
- **Scan Duration:** 1-3 seconds (typical)
- **Price Cache TTL:** 3 seconds
- **Opportunities Displayed:** Top 10
- **Min Profit Threshold:** 0.15%
- **Min Net Profit:** $2 USD

## Usage

```tsx
import { useFastArbitrageScanner } from "@/hooks/use-fast-arbitrage-scanner";

function MyComponent() {
  const {
    suggestions,      // Array of opportunities
    isScanning,       // Boolean scan state
    scanCount,        // Total scans completed
    lastScanTime,     // Last scan duration (ms)
    startScanning,    // Start function
    stopScanning,     // Stop function
    executeSuggestion // Execute arbitrage
  } = useFastArbitrageScanner();

  return (
    <button onClick={startScanning}>
      Start Scanner
    </button>
  );
}
```

## Components

### 1. `use-fast-arbitrage-scanner.ts`
Main hook with scanning logic

### 2. `fast-arbitrage-scanner.tsx`
UI component with real-time updates

### 3. `fastDexReader.ts`
Optimized price fetching service

## Future Enhancements

1. **WebSocket Support** - Real-time price streams
2. **MEV Protection** - Flashbots integration
3. **Gas Optimization** - Dynamic gas estimation
4. **Multi-hop Routes** - Complex arbitrage paths
5. **ML Predictions** - Profit probability scoring

## Comparison: Old vs New

| Feature | Old Scanner | Fast Scanner |
|---------|------------|--------------|
| Scan Time | 10-15s | 1-3s |
| Interval | 3s | 2s |
| Caching | None | 3s TTL |
| Parallel | Partial | Full |
| AI Validation | Yes | Optional |
| Connection Reuse | No | Yes |

## Notes

- The scanner uses Uniswap V3 quoters for accurate on-chain prices
- Across Protocol is used for bridge quotes and execution
- All opportunities are validated for profitability after fees
- Gas estimates are conservative (5x multiplier)
