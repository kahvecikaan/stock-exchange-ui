import axios from 'axios';
import {
    StockPrice,
    ChartData,
    UserPortfolio,
    Order,
    OrderRequest,
    WatchlistItem
} from '@/types';

// Create axios instance with default config
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// For debugging purposes
apiClient.interceptors.request.use(request => {
    console.log('Starting Request', request.url);
    return request;
  });

  // Stock API service
  export const stockApi = {
    // Get current stock price for a symbol
    getCurrentPrice: async (symbol:string): Promise<StockPrice> => {
        // Get the user's local timezone
        const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const response = await apiClient.get(`/stocks/${symbol}/price?timezone=${encodeURIComponent(localTimezone)}`);
        return response.data;
    },

    // Get chart data for a symbol with timezone parameter
    getStockChart: async (symbol: string, timeframe = '1m'): Promise<ChartData> => {
        // Get the user's local timezone
        const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Add timezone to request
        const response = await apiClient.get(
        `/charts/stock/${symbol}?timeframe=${timeframe}&timezone=${encodeURIComponent(localTimezone)}`
        );
        
        return response.data;
    },

    // Search for stocks by keyword
    searchStocks: async (keywords:string) => {
        const response = await apiClient.get(`/stocks/search?keywords=${keywords}`);
        return response.data;
    }
  };

  // Portfolio API service
  export const portfolioApi = {
    // Get user portfolio
    getUserPortfolio: async (userId: number): Promise<UserPortfolio> => {
        const response = await apiClient.get(`/portfolios/${userId}`);
        return response.data;
    },
    
    // Get portfolio chart data
    getPortfolioChart: async (userId: number, timeframe = '1m'): Promise<ChartData> => {
        const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await apiClient.get(
            `/charts/portfolio/${userId}?timeframe=${timeframe}&timezone=${encodeURIComponent(localTimezone)}`
        );
        return response.data;
    }
  };

  // Order API service
export const orderApi = {
    // Place a new order
    placeOrder: async (orderData: OrderRequest): Promise<Order> => {
        const response = await apiClient.post(`/orders`, orderData);
        return response.data;
    },
    
    // Get orders for a user
    getUserOrders: async (userId: number): Promise<Order[]> => {
        const response = await apiClient.get(`/orders/user/${userId}`);
        return response.data;
    },
    
    // Cancel an order
    cancelOrder: async (orderId: number): Promise<Order> => {
        const response = await apiClient.post(`/orders/${orderId}/cancel`);
        return response.data;
    }
  };
  
  // Watchlist API service
  export const watchlistApi = {
    // Get user watchlist
    getUserWatchlist: async (userId: number): Promise<WatchlistItem[]> => {
        const response = await apiClient.get(`/watchlists/${userId}`);
        return response.data;
    },
    
    // Add a symbol to watchlist
    addToWatchlist: async (userId: number, symbol: string): Promise<WatchlistItem> => {
        const response = await apiClient.post(`/watchlists/${userId}/${symbol}`);
        return response.data;
    },
    
    // Remove a symbol from watchlist
    removeFromWatchlist: async (userId: number, symbol: string): Promise<void> => {
        await apiClient.delete(`/watchlists/${userId}/${symbol}`);
    }
  };