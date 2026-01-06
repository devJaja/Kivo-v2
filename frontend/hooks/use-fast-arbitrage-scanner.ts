import { useState, useEffect, useCallback, useRef } from "react";
import { fastDexReader } from '@/lib/fastDexReader';
import { RealAcrossQuote } from "@/lib/acrossQuote";
import { CHAINS as AppChains, TOKENS as AppTokens } from '@/config';
import { useGeminiAI } from "./useGeminiAI";
import { useAcrossBridge } from "./useAcrossBridge";
import { useAccount } from 'wagmi';
import { ethers } from "ethers";
import { Address } from 'viem';
import { base, arbitrum, optimism, polygon, avalanche } from 'viem/chains';

const SCAN_INTERVAL = 2000; // 2 seconds - faster scanning
const MIN_PROFIT_THRESHOLD = 0.001; // 0.001% - 10x more sensitive
const TRADE_AMOUNT_USD = 100;

const CHAINS = [
  { id: '8453', name: "Base", chain: base },
  { id: '42161', name: "Arbitrum", chain: arbitrum },
];

const TOKENS = [
  { symbol: "WETH", decimals: 18 },
  { symbol: "USDC", decimals: 6 },
  { symbol: "USDT", decimals: 6 },
  { symbol: "DAI", decimals: 18 },
];

interface PriceData {
  chain: string;
  token: string;
  price: number;
  timestamp: number;
}

export interface FastArbitrageSuggestion {
  id: string;
  token: string;
  fromChain: string;
  toChain: string;
  fromChainId: number;
  toChainId: number;
  amount: string;
  profitPercent: number;
  netProfit: string;
  fromPrice: number;
  toPrice: number;
  timestamp: number;
  tokenDecimals: number;
}

export function useFastArbitrageScanner() {
  const [suggestions, setSuggestions] = useState<FastArbitrageSuggestion[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTime = useRef<number>(0);
  const priceCache = useRef<Map<string, PriceData>>(new Map());
  const acrossQuote = useRef(new RealAcrossQuote());
  
  const { generateContent } = useGeminiAI();
  const { executeBridge } = useAcrossBridge();
  const { address } = useAccount();

  const getTokenAddress = (chainName: string, tokenSymbol: string): Address | undefined => {
    const chainKey = chainName.toLowerCase() as keyof typeof AppTokens;
    const chainTokens = AppTokens[chainKey];
    return chainTokens?.[tokenSymbol as keyof typeof chainTokens] as Address;
  };

  const fetchAllPrices = async (): Promise<PriceData[]> => {
    const promises = CHAINS.flatMap(chain =>
      TOKENS.map(async token => {
        try {
          const price = await fastDexReader.getPrice(
            chain.name as keyof typeof AppChains,
            token.symbol,
            'USDC'
          );
          return price ? {
            chain: chain.id,
            token: token.symbol,
            price,
            timestamp: Date.now()
          } : null;
        } catch {
          return null;
        }
      })
    );

    const results = await Promise.allSettled(promises);
    return results
      .filter((r): r is PromiseFulfilledResult<PriceData | null> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value!);
  };

  const findArbitrageOpportunities = async (prices: PriceData[]): Promise<FastArbitrageSuggestion[]> => {
    const opportunities: FastArbitrageSuggestion[] = [];
    const priceMap = new Map<string, Map<string, number>>();

    prices.forEach(p => {
      if (!priceMap.has(p.chain)) priceMap.set(p.chain, new Map());
      priceMap.get(p.chain)!.set(p.token, p.price);
    });

    // 1. STABLECOIN ARBITRAGE - Easiest opportunities
    const stablecoins = ['USDC', 'USDT', 'DAI'];
    for (const stable1 of stablecoins) {
      for (const stable2 of stablecoins) {
        if (stable1 === stable2) continue;
        
        for (const chain of CHAINS) {
          const price1 = priceMap.get(chain.id)?.get(stable1);
          const price2 = priceMap.get(chain.id)?.get(stable2);
          
          if (price1 && price2) {
            const deviation = Math.abs(price1 - price2);
            const profitPercent = (deviation / Math.min(price1, price2)) * 100;
            
            if (profitPercent > MIN_PROFIT_THRESHOLD) {
              const amount = (TRADE_AMOUNT_USD / Math.min(price1, price2)).toFixed(6);
              const grossProfit = TRADE_AMOUNT_USD * (profitPercent / 100);
              const netProfit = grossProfit - 1;

              if (netProfit > 0.05) {
                opportunities.push({
                  id: `stable_${stable1}_${stable2}_${chain.id}_${Date.now()}`,
                  token: `${stable1}/${stable2}`,
                  fromChain: chain.name,
                  toChain: chain.name,
                  fromChainId: parseInt(chain.id),
                  toChainId: parseInt(chain.id),
                  amount,
                  profitPercent,
                  netProfit: netProfit.toFixed(2),
                  fromPrice: price1,
                  toPrice: price2,
                  timestamp: Date.now(),
                  tokenDecimals: 6,
                });
              }
            }
          }
        }
      }
    }

    // 2. CROSS-CHAIN ARBITRAGE
    for (const token of TOKENS) {
      
      for (const fromChain of CHAINS) {
        const fromPrice = priceMap.get(fromChain.id)?.get(token.symbol);
        if (!fromPrice) continue;

        for (const toChain of CHAINS) {
          if (fromChain.id === toChain.id) continue;
          
          const toPrice = priceMap.get(toChain.id)?.get(token.symbol);
          if (!toPrice) continue;

          const profitPercent = ((toPrice - fromPrice) / fromPrice) * 100;
          
          if (profitPercent > MIN_PROFIT_THRESHOLD) {
            const amount = (TRADE_AMOUNT_USD / fromPrice).toFixed(token.decimals);
            const grossProfit = TRADE_AMOUNT_USD * (profitPercent / 100);
            const estimatedFees = 2;
            const netProfit = grossProfit - estimatedFees;

            if (netProfit > 0.05) {
              opportunities.push({
                id: `${token.symbol}_${fromChain.id}_${toChain.id}_${Date.now()}`,
                token: token.symbol,
                fromChain: fromChain.name,
                toChain: toChain.name,
                fromChainId: parseInt(fromChain.id),
                toChainId: parseInt(toChain.id),
                amount,
                profitPercent,
                netProfit: netProfit.toFixed(2),
                fromPrice,
                toPrice,
                timestamp: Date.now(),
                tokenDecimals: token.decimals,
              });
            }
          }
        }
      }
    }

    return opportunities.sort((a, b) => parseFloat(b.netProfit) - parseFloat(a.netProfit)).slice(0, 30);
  };

  const scan = useCallback(async () => {
    const startTime = Date.now();
    
    const prices = await fetchAllPrices();
    const opportunities = await findArbitrageOpportunities(prices);
    
    if (opportunities.length > 0) {
      // Clear timeout when opportunities are found
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setTimeoutMessage(null);
      
      setSuggestions(prev => {
        const combined = [...opportunities, ...prev];
        const unique = combined.filter((opp, index, self) =>
          index === self.findIndex(o => 
            o.token === opp.token && 
            o.fromChainId === opp.fromChainId && 
            o.toChainId === opp.toChainId
          )
        );
        return unique.slice(0, 20);
      });
    }

    setScanCount(prev => prev + 1);
    setLastScanTime(Date.now() - startTime);
  }, []);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setSuggestions([]);
    setScanCount(0);
    setTimeoutMessage(null);
    scanStartTime.current = Date.now();
    
    scan();
    scanIntervalRef.current = setInterval(scan, SCAN_INTERVAL);
    
    // Auto-stop after 2 minutes if no opportunities found
    timeoutRef.current = setTimeout(() => {
      if (suggestions.length === 0) {
        stopScanning();
        setTimeoutMessage("No opportunities found after 2 minutes. Market may be efficient right now. Try again later or during high volatility periods.");
      }
    }, 120000); // 2 minutes
  }, [scan]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const executeSuggestion = async (suggestion: FastArbitrageSuggestion) => {
    try {
      const inputTokenAddress = getTokenAddress(suggestion.fromChain, suggestion.token);
      const outputTokenAddress = getTokenAddress(suggestion.toChain, suggestion.token);

      if (!inputTokenAddress || !outputTokenAddress) {
        throw new Error(`Token address not found`);
      }

      await executeBridge({
        fromChainId: suggestion.fromChainId,
        toChainId: suggestion.toChainId,
        inputTokenAddress,
        outputTokenAddress,
        amount: suggestion.amount,
        decimals: suggestion.tokenDecimals,
        isNative: suggestion.token === 'WETH',
        recipient: (address as Address) || (ethers.ZeroAddress as Address),
      });

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Execution failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isScanning,
    scanCount,
    lastScanTime,
    timeoutMessage,
    startScanning,
    stopScanning,
    executeSuggestion,
  };
}
