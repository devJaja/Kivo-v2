# 📖 Fast Arbitrage Scanner - Usage Examples

## Basic Usage

### Starting the Scanner

```typescript
import { useFastArbitrageScanner } from "@/hooks/use-fast-arbitrage-scanner";

function MyComponent() {
  const { startScanning, isScanning } = useFastArbitrageScanner();
  
  return (
    <button onClick={startScanning} disabled={isScanning}>
      Start Scanner
    </button>
  );
}
```

### Displaying Opportunities

```typescript
function OpportunitiesList() {
  const { suggestions, isScanning } = useFastArbitrageScanner();
  
  return (
    <div>
      {isScanning && <p>Scanning...</p>}
      {suggestions.map(opp => (
        <div key={opp.id}>
          <h3>{opp.token}</h3>
          <p>{opp.fromChain} → {opp.toChain}</p>
          <p>Profit: {opp.profitPercent}%</p>
          <p>Net: ${opp.netProfit}</p>
        </div>
      ))}
    </div>
  );
}
```

### Executing Trades

```typescript
function ExecuteButton({ suggestion }) {
  const { executeSuggestion } = useFastArbitrageScanner();
  const [loading, setLoading] = useState(false);
  
  const handleExecute = async () => {
    setLoading(true);
    try {
      await executeSuggestion(suggestion);
      alert('Trade executed successfully!');
    } catch (error) {
      alert('Trade failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handleExecute} disabled={loading}>
      {loading ? 'Executing...' : 'Execute'}
    </button>
  );
}
```

## Advanced Usage

### Performance Monitoring

```typescript
function PerformanceMonitor() {
  const { scanCount, lastScanTime, isScanning } = useFastArbitrageScanner();
  
  const getSpeedColor = (time: number) => {
    if (time < 2000) return 'green';
    if (time < 4000) return 'yellow';
    return 'red';
  };
  
  return (
    <div>
      {isScanning && (
        <>
          <p>Scans: {scanCount}</p>
          <p style={{ color: getSpeedColor(lastScanTime) }}>
            Speed: {lastScanTime}ms
          </p>
        </>
      )}
    </div>
  );
}
```

### Filtering Opportunities

```typescript
function FilteredOpportunities() {
  const { suggestions } = useFastArbitrageScanner();
  
  // Only show high-profit opportunities
  const highProfit = suggestions.filter(s => s.profitPercent > 1.0);
  
  // Only show specific token
  const wethOnly = suggestions.filter(s => s.token === 'WETH');
  
  // Only show specific chain
  const baseOnly = suggestions.filter(s => s.fromChain === 'Base');
  
  return (
    <div>
      <h3>High Profit ({highProfit.length})</h3>
      <h3>WETH Only ({wethOnly.length})</h3>
      <h3>Base Only ({baseOnly.length})</h3>
    </div>
  );
}
```

### Auto-Execute on Threshold

```typescript
function AutoExecutor() {
  const { suggestions, executeSuggestion } = useFastArbitrageScanner();
  const [autoExecute, setAutoExecute] = useState(false);
  const [minProfit, setMinProfit] = useState(2.0);
  
  useEffect(() => {
    if (!autoExecute) return;
    
    const highProfitOpps = suggestions.filter(
      s => s.profitPercent >= minProfit
    );
    
    if (highProfitOpps.length > 0) {
      // Execute the best opportunity
      const best = highProfitOpps[0];
      executeSuggestion(best);
    }
  }, [suggestions, autoExecute, minProfit]);
  
  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={autoExecute}
          onChange={e => setAutoExecute(e.target.checked)}
        />
        Auto-execute above {minProfit}%
      </label>
    </div>
  );
}
```

### Custom Notifications

```typescript
function NotificationSystem() {
  const { suggestions } = useFastArbitrageScanner();
  const prevCount = useRef(0);
  
  useEffect(() => {
    if (suggestions.length > prevCount.current) {
      const newOpps = suggestions.length - prevCount.current;
      
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('New Arbitrage Opportunity!', {
          body: `Found ${newOpps} new opportunities`,
          icon: '/kivo-logo.png'
        });
      }
      
      // Sound notification
      const audio = new Audio('/notification.mp3');
      audio.play();
    }
    
    prevCount.current = suggestions.length;
  }, [suggestions]);
  
  return null;
}
```

## Integration Examples

### With Dashboard

```typescript
// components/dashboard.tsx
import FastArbitrageScanner from "@/components/fast-arbitrage-scanner";

export default function Dashboard() {
  return (
    <div className="dashboard">
      <WalletCard />
      <FastArbitrageScanner />
      <TransactionList />
    </div>
  );
}
```

### With Modal

```typescript
function ArbitrageScannerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { startScanning, stopScanning } = useFastArbitrageScanner();
  
  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [isOpen]);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Scanner
      </button>
      
      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          <FastArbitrageScanner />
        </Modal>
      )}
    </>
  );
}
```

### With Analytics

```typescript
function AnalyticsTracker() {
  const { suggestions, scanCount } = useFastArbitrageScanner();
  
  useEffect(() => {
    // Track scan metrics
    analytics.track('arbitrage_scan', {
      scan_count: scanCount,
      opportunities_found: suggestions.length,
      timestamp: Date.now()
    });
  }, [scanCount, suggestions]);
  
  useEffect(() => {
    // Track new opportunities
    suggestions.forEach(opp => {
      analytics.track('opportunity_found', {
        token: opp.token,
        from_chain: opp.fromChain,
        to_chain: opp.toChain,
        profit_percent: opp.profitPercent,
        net_profit: opp.netProfit
      });
    });
  }, [suggestions]);
  
  return null;
}
```

## Testing Examples

### Mock Scanner for Testing

```typescript
// For testing without real RPC calls
function MockScanner() {
  const [suggestions, setSuggestions] = useState([]);
  
  const startMockScanning = () => {
    setInterval(() => {
      const mockOpp = {
        id: `mock_${Date.now()}`,
        token: 'WETH',
        fromChain: 'Base',
        toChain: 'Arbitrum',
        fromChainId: 8453,
        toChainId: 42161,
        amount: '0.5',
        profitPercent: 1.5,
        netProfit: '25.00',
        fromPrice: 3000,
        toPrice: 3045,
        timestamp: Date.now(),
        tokenDecimals: 18
      };
      
      setSuggestions(prev => [mockOpp, ...prev].slice(0, 5));
    }, 3000);
  };
  
  return { suggestions, startScanning: startMockScanning };
}
```

### Unit Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useFastArbitrageScanner } from './use-fast-arbitrage-scanner';

describe('useFastArbitrageScanner', () => {
  it('should start scanning', () => {
    const { result } = renderHook(() => useFastArbitrageScanner());
    
    act(() => {
      result.current.startScanning();
    });
    
    expect(result.current.isScanning).toBe(true);
  });
  
  it('should stop scanning', () => {
    const { result } = renderHook(() => useFastArbitrageScanner());
    
    act(() => {
      result.current.startScanning();
      result.current.stopScanning();
    });
    
    expect(result.current.isScanning).toBe(false);
  });
});
```

## Best Practices

### 1. Always Stop Scanner on Unmount

```typescript
function MyComponent() {
  const { startScanning, stopScanning } = useFastArbitrageScanner();
  
  useEffect(() => {
    startScanning();
    return () => stopScanning(); // Cleanup
  }, []);
}
```

### 2. Handle Errors Gracefully

```typescript
async function handleExecute(suggestion) {
  try {
    await executeSuggestion(suggestion);
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      alert('Insufficient balance');
    } else if (error.code === 'USER_REJECTED') {
      alert('Transaction cancelled');
    } else {
      console.error('Execution failed:', error);
      alert('Trade failed. Please try again.');
    }
  }
}
```

### 3. Debounce Rapid Updates

```typescript
function DebouncedOpportunities() {
  const { suggestions } = useFastArbitrageScanner();
  const [debouncedSuggestions, setDebouncedSuggestions] = useState([]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSuggestions(suggestions);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [suggestions]);
  
  return <OpportunitiesList suggestions={debouncedSuggestions} />;
}
```

### 4. Optimize Re-renders

```typescript
function OptimizedList() {
  const { suggestions } = useFastArbitrageScanner();
  
  // Memoize expensive calculations
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => 
      parseFloat(b.netProfit) - parseFloat(a.netProfit)
    );
  }, [suggestions]);
  
  return (
    <>
      {sortedSuggestions.map(opp => (
        <MemoizedOpportunityCard key={opp.id} opportunity={opp} />
      ))}
    </>
  );
}

const MemoizedOpportunityCard = memo(OpportunityCard);
```

## Common Patterns

### Loading State

```typescript
function ScannerWithLoading() {
  const { isScanning, suggestions } = useFastArbitrageScanner();
  
  if (isScanning && suggestions.length === 0) {
    return <LoadingSpinner />;
  }
  
  return <OpportunitiesList suggestions={suggestions} />;
}
```

### Empty State

```typescript
function ScannerWithEmptyState() {
  const { suggestions, isScanning } = useFastArbitrageScanner();
  
  if (!isScanning && suggestions.length === 0) {
    return (
      <EmptyState 
        title="No opportunities yet"
        description="Start scanning to find arbitrage opportunities"
      />
    );
  }
  
  return <OpportunitiesList suggestions={suggestions} />;
}
```

### Error Boundary

```typescript
class ScannerErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    
    return this.props.children;
  }
}

// Usage
<ScannerErrorBoundary>
  <FastArbitrageScanner />
</ScannerErrorBoundary>
```
