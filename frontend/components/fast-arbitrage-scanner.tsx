"use client";

import { useFastArbitrageScanner } from "@/hooks/use-fast-arbitrage-scanner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Zap, Square, TrendingUp, ArrowRight } from "lucide-react";

export default function FastArbitrageScanner() {
  const {
    suggestions,
    isScanning,
    scanCount,
    lastScanTime,
    timeoutMessage,
    startScanning,
    stopScanning,
    executeSuggestion,
  } = useFastArbitrageScanner();

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            ⚡ Fast Arbitrage Scanner
            {isScanning && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </h2>
          {isScanning && (
            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
              <span>Scans: <span className="font-mono text-foreground">{scanCount}</span></span>
              <span>•</span>
              <span>Speed: <span className={`font-mono ${lastScanTime < 2000 ? 'text-green-500' : lastScanTime < 4000 ? 'text-yellow-500' : 'text-red-500'}`}>{lastScanTime}ms</span></span>
              <span>•</span>
              <span>Found: <span className="font-mono text-green-500">{suggestions.length}</span></span>
            </div>
          )}
        </div>
        {!isScanning ? (
          <Button onClick={startScanning}>
            <Zap className="mr-2 h-4 w-4" />
            Start Scanner
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="destructive">
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )}
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <h3 className="font-semibold text-sm text-muted-foreground">
              {suggestions.length} Live Opportunities
            </h3>
            {suggestions.map((opp) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-muted/50 border border-border rounded-lg p-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="font-bold">{opp.token}</span>
                    <span className="text-xs text-muted-foreground">
                      {opp.fromChain} <ArrowRight className="inline h-3 w-3" /> {opp.toChain}
                    </span>
                  </div>
                  <span className="text-green-400 font-bold">
                    +{opp.profitPercent.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <p>Net Profit: <span className="font-mono text-green-400">${opp.netProfit}</span></p>
                    <p className="text-muted-foreground">
                      ${opp.fromPrice.toFixed(2)} → ${opp.toPrice.toFixed(2)}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => executeSuggestion(opp)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Execute
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isScanning && suggestions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Scanning for opportunities...</p>
          <p className="text-xs mt-1">Auto-stops after 2 minutes if none found</p>
        </div>
      )}

      {timeoutMessage && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
          <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-2">⏱️ Scan Timeout</p>
          <p className="text-muted-foreground">{timeoutMessage}</p>
          <button 
            onClick={startScanning}
            className="mt-3 text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
