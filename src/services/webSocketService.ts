import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { StockPrice, ChartData } from '@/types';

// Base URL for WebSocket connection
const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Singleton pattern for WebSocket service
class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private priceUpdateCallbacks: Map<string, Set<(price: StockPrice) => void>> = new Map();
  private chartUpdateCallbacks: Map<string, Set<(chartData: ChartData) => void>> = new Map();
  private connectionStateCallbacks: Set<(connected: boolean) => void> = new Set();
  
  // Initialize WebSocket connection
  public init(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const client = new Client({
          webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
          debug: (msg) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[WebSocket]', msg);
            }
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });
        
        client.onConnect = () => {
          console.log('WebSocket connected');
          this.client = client;
          this.connected = true;
          this.notifyConnectionState(true);
          
          // Resubscribe to all active topics
          this.resubscribeAll();
          
          resolve();
        };
        
        client.onStompError = (frame) => {
          console.error('WebSocket STOMP error:', frame);
          this.notifyConnectionState(false);
        };
        
        client.onWebSocketError = (event) => {
          console.error('WebSocket error:', event);
          this.notifyConnectionState(false);
          reject(new Error('WebSocket connection error'));
        };
        
        client.onDisconnect = () => {
          console.log('WebSocket disconnected');
          this.connected = false;
          this.notifyConnectionState(false);
        };
        
        // Start the client
        client.activate();
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        this.notifyConnectionState(false);
        this.connectionPromise = null;
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }
  
  // Resubscribe to all active topics after reconnection
  private resubscribeAll(): void {
    // Resubscribe to price updates
    for (const symbol of this.priceUpdateCallbacks.keys()) {
      this.subscribeToPrice(symbol);
    }
    
    // Resubscribe to chart updates
    for (const topicKey of this.chartUpdateCallbacks.keys()) {
      // topicKey format: "symbol/timeframe"
      const [symbol, timeframe] = topicKey.split('/');
      this.subscribeToChart(symbol, timeframe);
    }
  }
  
  // Subscribe to real-time price updates for a symbol
  private subscribeToPrice(symbol: string): void {
    if (!this.client || !this.connected) {
      console.warn(`Cannot subscribe to price updates for ${symbol} - WebSocket not connected`);
      return;
    }
    
    const topic = `/topic/prices/${symbol.toUpperCase()}`;
    
    // Only subscribe if we haven't already
    if (!this.subscriptions.has(topic)) {
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const stockPrice: StockPrice = JSON.parse(message.body);
          console.log(`Received real-time price update for ${symbol}:`, stockPrice);
          
          // Notify all callbacks registered for this symbol
          const callbacks = this.priceUpdateCallbacks.get(symbol.toUpperCase());
          if (callbacks) {
            callbacks.forEach(callback => callback(stockPrice));
          }
        } catch (error) {
          console.error('Error processing price update:', error);
        }
      });
      
      this.subscriptions.set(topic, subscription);
      console.log(`Subscribed to price updates for ${symbol}`);
    }
  }
  
  // Subscribe to real-time chart updates for a symbol and timeframe
  private subscribeToChart(symbol: string, timeframe: string): void {
    if (!this.client || !this.connected) {
      console.warn(`Cannot subscribe to chart updates for ${symbol} - WebSocket not connected`);
      return;
    }
    
    const topic = `/topic/charts/${symbol.toUpperCase()}/${timeframe}`;
    const topicKey = `${symbol.toUpperCase()}/${timeframe}`;
    
    // Only subscribe if we haven't already
    if (!this.subscriptions.has(topic)) {
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const chartData: ChartData = JSON.parse(message.body);
          console.log(`Received real-time chart update for ${symbol} (${timeframe})`);
          
          // Notify all callbacks registered for this chart
          const callbacks = this.chartUpdateCallbacks.get(topicKey);
          if (callbacks) {
            callbacks.forEach(callback => callback(chartData));
          }
        } catch (error) {
          console.error('Error processing chart update:', error);
        }
      });
      
      this.subscriptions.set(topic, subscription);
      console.log(`Subscribed to chart updates for ${symbol} (${timeframe})`);
    }
  }
  
  // Register a callback for price updates
  public onPriceUpdate(symbol: string, callback: (price: StockPrice) => void): () => void {
    if (!symbol) return () => {};
    
    const upperSymbol = symbol.toUpperCase();
    
    // Create a callback set for this symbol if it doesn't exist
    if (!this.priceUpdateCallbacks.has(upperSymbol)) {
      this.priceUpdateCallbacks.set(upperSymbol, new Set());
    }
    
    // Add the callback
    const callbacks = this.priceUpdateCallbacks.get(upperSymbol)!;
    callbacks.add(callback);
    
    // Initialize the WebSocket connection if needed
    this.init().then(() => {
      // Subscribe to the symbol updates
      this.subscribeToPrice(upperSymbol);
    }).catch(error => {
      console.error(`Failed to initialize WebSocket for ${upperSymbol}:`, error);
    });
    
    // Return an unsubscribe function
    return () => {
      const callbackSet = this.priceUpdateCallbacks.get(upperSymbol);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          this.priceUpdateCallbacks.delete(upperSymbol);
          // Note: We don't unsubscribe from the topic to avoid complexity
          // when multiple components might be using the same symbol
        }
      }
    };
  }
  
  // Register a callback for chart updates
  public onChartUpdate(symbol: string, timeframe: string, callback: (chartData: ChartData) => void): () => void {
    if (!symbol || !timeframe) return () => {};
    
    const upperSymbol = symbol.toUpperCase();
    const topicKey = `${upperSymbol}/${timeframe}`;
    
    // Create a callback set for this chart if it doesn't exist
    if (!this.chartUpdateCallbacks.has(topicKey)) {
      this.chartUpdateCallbacks.set(topicKey, new Set());
    }
    
    // Add the callback
    const callbacks = this.chartUpdateCallbacks.get(topicKey)!;
    callbacks.add(callback);
    
    // Initialize the WebSocket connection if needed
    this.init().then(() => {
      // Subscribe to the chart updates
      this.subscribeToChart(upperSymbol, timeframe);
    }).catch(error => {
      console.error(`Failed to initialize WebSocket for chart ${upperSymbol}/${timeframe}:`, error);
    });
    
    // Return an unsubscribe function
    return () => {
      const callbackSet = this.chartUpdateCallbacks.get(topicKey);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          this.chartUpdateCallbacks.delete(topicKey);
          // We don't unsubscribe for the same reason as with prices
        }
      }
    };
  }
  
  // Register a callback for connection state changes
  public onConnectionStateChange(callback: (connected: boolean) => void): () => void {
    this.connectionStateCallbacks.add(callback);
    
    // Immediately notify with current state
    callback(this.connected);
    
    // Return an unsubscribe function
    return () => {
      this.connectionStateCallbacks.delete(callback);
    };
  }
  
  // Notify all connection state callbacks
  private notifyConnectionState(connected: boolean): void {
    this.connectionStateCallbacks.forEach(callback => callback(connected));
  }
  
  // Get current connection state
  public isConnected(): boolean {
    return this.connected;
  }
  
  // Force reconnect
  public reconnect(): void {
    if (this.client) {
      this.client.deactivate();
    }
    
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.notifyConnectionState(false);
    
    setTimeout(() => this.init(), 1000);
  }
  
  // Disconnect WebSocket
  public disconnect(): void {
    if (this.client) {
      this.client.deactivate();
    }
    
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.subscriptions.clear();
    this.notifyConnectionState(false);
  }
}

// Export a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;