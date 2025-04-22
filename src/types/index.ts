// Stock-related types
export interface StockPrice {
    symbol: string;
    price: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    change?: number;
    changePercent?: number;
    timestamp: string;
    zonedTimestamp?: string;
  }
  
  export interface ChartData {
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    labels: string[];
    datasets: {
      [key: string]: number[];
    };
  }
  
  // Portfolio-related types
  export interface Holding {
    id: number;
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercentage: number;
  }
  
  export interface UserPortfolio {
    userId: number;
    username: string;
    cashBalance: number;
    portfolioValue: number;
    totalValue: number;
    holdings: Holding[];
  }
  
  // Order-related types
  export interface Order {
    id: number;
    userId: number;
    symbol: string;
    orderType: 'MARKET' | 'LIMIT';
    side: 'BUY' | 'SELL';
    status: 'PENDING' | 'EXECUTED' | 'CANCELED' | 'FAILED';
    quantity: number;
    price: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface OrderRequest {
    userId: number;
    symbol: string;
    orderType: 'MARKET' | 'LIMIT';
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
  }
  
  // Watchlist-related types
  export interface WatchlistItem {
    id: number;
    userId: number;
    symbol: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    addedAt: string;
  }