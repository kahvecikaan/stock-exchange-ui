"use client";

import { useState, useEffect } from 'react';
import { StockPrice } from '@/types';
import webSocketService from '@/services/webSocketService';

interface UseStockWebSocketProps {
  symbol: string;
  initialPrice?: StockPrice | null;
}

interface UseStockWebSocketResult {
  price: StockPrice | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export const useStockWebSocket = ({
  symbol,
  initialPrice = null,
}: UseStockWebSocketProps): UseStockWebSocketResult => {
  const [price, setPrice] = useState<StockPrice | null>(initialPrice);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    webSocketService.init().catch((err) => {
      console.error('Failed to initialize WebSocket connection:', err);
      setError('WebSocket connection failed. Some features may not work.');
    });

    // Subscribe to connection state changes
    const unsubscribeConnection = webSocketService.onConnectionStateChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        setError(null);
      }
    });

    return () => {
      unsubscribeConnection();
    };
  }, []);

  // Subscribe to price updates for the given symbol
  useEffect(() => {
    if (!symbol) {
      return () => {};
    }

    // Subscribe to price updates
    const unsubscribe = webSocketService.onPriceUpdate(symbol, (newPrice) => {
      setPrice(newPrice);
      setError(null); // Clear any previous errors
    });

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  // Function to manually reconnect
  const reconnect = () => {
    webSocketService.reconnect();
  };

  return { price, isConnected, error, reconnect };
};

export default useStockWebSocket;