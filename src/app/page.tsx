"use client";

import { useState, useEffect, useRef } from "react";
import { stockApi, marketApi } from "@/services/api";
import StockChart from "@/components/charts/StockChart";
import SymbolSearch from "@/components/ui/SymbolSearch";
import OrderForm from "@/components/features/orders/OrderForm";
import PortfolioSummary from "@/components/features/portfolio/PortfolioSummary";
import HoldingsTable from "@/components/features/portfolio/HoldingsTable";
import { ChartData, StockPrice } from "@/types";
import useStockWebSocket from "@/hooks/useStockWebSocket";

const DEFAULT_USER_ID = 1;

export default function HomePage() {
  // Core application state
  const [symbol, setSymbol] = useState("ARM");
  const [timeframe, setTimeframe] = useState("1m");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [stockPrice, setStockPrice] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // Enhanced timeframe-aware price change management
  // This centralizes all price change calculations to ensure consistency across components
  const [currentTimeframeStartPrice, setCurrentTimeframeStartPrice] =
    useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [timeframeChangeMetrics, setTimeframeChangeMetrics] = useState({
    priceChange: 0,
    percentChange: 0,
    isPriceUp: false,
  });

  // Component management state
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [portfolioRefreshCounter, setPortfolioRefreshCounter] = useState(0);

  // Live price WebSocket hook - using the centrally managed current price
  const {
    price: wsPrice,
    isConnected: wsConnected,
    error: wsError,
    reconnect: reconnectWs,
  } = useStockWebSocket({ symbol, initialPrice: stockPrice });

  // Enhanced data loading with centralized timeframe baseline management
  useEffect(() => {
    // Clear all states when starting new data load
    setChartData(null);
    setStockPrice(null);
    setCurrentTimeframeStartPrice(0);
    setCurrentPrice(0);
    setTimeframeChangeMetrics({
      priceChange: 0,
      percentChange: 0,
      isPriceUp: false,
    });
    setError(null);
    setLoading(true);

    (async () => {
      try {
        // Load both chart data and current stock price information
        const [chartDataResponse, stockPriceResponse] = await Promise.all([
          stockApi.getStockChart(symbol, timeframe),
          stockApi.getCurrentPrice(symbol),
        ]);

        // Store the loaded data
        setChartData(chartDataResponse);
        setStockPrice(stockPriceResponse);

        // Extract price dataset for establishing timeframe baseline
        const priceDataset = chartDataResponse.datasets.Price || [];
        const validPrices = priceDataset.filter(
          (price) => price && !isNaN(price) && price > 0
        );

        if (validPrices.length > 0) {
          // Establish timeframe baseline using first and last prices from the dataset
          const timeframeStartPrice = validPrices[0]; // Beginning of the timeframe period
          const timeframeEndPrice = validPrices[validPrices.length - 1]; // End of the timeframe period

          // Set up the centralized timeframe-aware state
          setCurrentTimeframeStartPrice(timeframeStartPrice);
          setCurrentPrice(timeframeEndPrice);

          // Calculate the overall change for this timeframe period
          const change = timeframeEndPrice - timeframeStartPrice;
          const percentChange =
            timeframeStartPrice > 0 ? (change / timeframeStartPrice) * 100 : 0;

          setTimeframeChangeMetrics({
            priceChange: change,
            percentChange: percentChange,
            isPriceUp: change >= 0,
          });

          console.log(
            `Established centralized timeframe baseline for ${symbol} ${timeframe}:`,
            {
              symbol,
              timeframe,
              startPrice: timeframeStartPrice.toFixed(2),
              endPrice: timeframeEndPrice.toFixed(2),
              change: change.toFixed(2),
              percentChange: percentChange.toFixed(2),
              dataPoints: validPrices.length,
            }
          );
        } else {
          console.warn(
            `No valid price data available for ${symbol} ${timeframe}`
          );
        }
      } catch (e) {
        console.error("Failed to load stock data:", e);
        setError("Failed to load stock data");
      } finally {
        setLoading(false);
      }
    })();
  }, [symbol, timeframe]); // Recalculate baseline whenever symbol or timeframe changes

  // Enhanced WebSocket integration with timeframe-aware price updates
  useEffect(() => {
    // Validate that we have the necessary data for price update calculations
    if (
      !wsPrice ||
      currentTimeframeStartPrice <= 0 ||
      wsPrice.symbol.toUpperCase() !== symbol.toUpperCase()
    ) {
      return;
    }

    console.log(`Processing WebSocket price update for ${symbol}:`, {
      newPrice: wsPrice.price.toFixed(2),
      baselinePrice: currentTimeframeStartPrice.toFixed(2),
      timeframe: timeframe,
    });

    // Update current price state
    setCurrentPrice(wsPrice.price);

    // Recalculate change metrics using the established timeframe baseline
    const change = wsPrice.price - currentTimeframeStartPrice;
    const percentChange = (change / currentTimeframeStartPrice) * 100;

    // Update the centralized change metrics that drive all UI displays
    setTimeframeChangeMetrics({
      priceChange: change,
      percentChange: percentChange,
      isPriceUp: change >= 0,
    });

    // Update the stockPrice state with calculated change information for other components
    setStockPrice({
      ...wsPrice,
      change: change,
      changePercent: percentChange,
    });

    // Append new data point to chart data for real-time chart updates
    setChartData((prevChartData) => {
      if (!prevChartData) return prevChartData;

      const timestamp =
        wsPrice.zonedTimestamp ?? wsPrice.timestamp ?? new Date().toISOString();
      const label = new Date(timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        ...prevChartData,
        labels: [...prevChartData.labels, label],
        datasets: {
          ...prevChartData.datasets,
          Price: [...(prevChartData.datasets.Price || []), wsPrice.price],
        },
      };
    });
  }, [wsPrice, currentTimeframeStartPrice, symbol, timeframe]);

  // Manual price refresh functionality with timeframe awareness
  const refreshPrice = async () => {
    try {
      const freshStockPrice = await stockApi.getCurrentPrice(symbol);

      if (currentTimeframeStartPrice > 0) {
        // Calculate change relative to current timeframe baseline
        const change = freshStockPrice.price - currentTimeframeStartPrice;
        const percentChange = (change / currentTimeframeStartPrice) * 100;

        // Update all price-related state consistently
        setCurrentPrice(freshStockPrice.price);
        setTimeframeChangeMetrics({
          priceChange: change,
          percentChange: percentChange,
          isPriceUp: change >= 0,
        });
        setStockPrice({
          ...freshStockPrice,
          change,
          changePercent: percentChange,
        });
      } else {
        // Fallback for cases where baseline hasn't been established yet
        setStockPrice(freshStockPrice);
      }
    } catch (e) {
      console.error("Failed to refresh price:", e);
    }
  };

  // Market status monitoring with timeframe-aware price updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkMarketStatusAndUpdatePrices = async () => {
      try {
        const { isOpen } = await marketApi.getStatus();
        setIsMarketOpen(isOpen);

        // Only refresh prices when market is open and we have a proper baseline
        if (isOpen && currentTimeframeStartPrice > 0) {
          refreshPrice();
        }
      } catch (e) {
        console.error("Market status check failed", e);
      }
    };

    // Initial check and then periodic polling
    checkMarketStatusAndUpdatePrices();
    intervalId = setInterval(checkMarketStatusAndUpdatePrices, 30_000);

    return () => clearInterval(intervalId);
  }, [symbol, currentTimeframeStartPrice]); // Include baseline in dependencies

  // Portfolio and order management functions
  const refreshPortfolio = () => setPortfolioRefreshCounter((prev) => prev + 1);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderAction, setOrderAction] = useState<"BUY" | "SELL">("BUY");
  const handleOrderComplete = () => {
    setOrderModalOpen(false);
    refreshPortfolio();
  };

  // Enhanced price display component using centralized timeframe metrics
  const renderPrice = () => {
    if (!stockPrice) return null;

    // Use the centrally managed timeframe change metrics for consistent display
    const { timestamp, zonedTimestamp } = stockPrice;
    const displayPrice = currentPrice || stockPrice.price;
    const { priceChange, percentChange, isPriceUp } = timeframeChangeMetrics;

    // Format values for display
    const formattedPrice = displayPrice.toFixed(2);
    const formattedChange = priceChange.toFixed(2);
    const formattedPercent = percentChange.toFixed(2);
    const changeSign = isPriceUp ? "+" : "";
    const lastUpdateTime = new Date(
      zonedTimestamp ?? timestamp ?? ""
    ).toLocaleString();

    // Determine color styling based on price direction
    const changeColorClass = isPriceUp
      ? "text-green-600"
      : priceChange < 0
      ? "text-red-600"
      : "text-gray-700";

    return (
      <div className="mb-4">
        <div className="flex items-baseline flex-wrap">
          <h2 className="text-3xl font-bold text-gray-900">
            ${formattedPrice}
          </h2>
          <span className={`ml-2 text-lg font-semibold ${changeColorClass}`}>
            {changeSign}
            {formattedChange} ({changeSign}
            {formattedPercent}%)
          </span>

          {/* Market status indicator */}
          <span
            className="ml-3 px-2 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: isMarketOpen ? "#dcfce7" : "#fee2e2",
              color: isMarketOpen ? "#166534" : "#991b1b",
            }}
          >
            {isMarketOpen ? "Market Open" : "Market Closed"}
          </span>

          {/* WebSocket connection status indicator */}
          <span
            className="ml-3 px-2 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: wsConnected ? "#dbeafe" : "#fef9c3",
              color: wsConnected ? "#1e40af" : "#854d0e",
            }}
          >
            {wsConnected ? "Live" : "Polling"}
          </span>
        </div>

        <div className="text-sm text-gray-600 mt-1">
          Last updated: {lastUpdateTime}
          {currentTimeframeStartPrice > 0}
        </div>

        <div className="flex space-x-2 mt-3">
          <button
            onClick={refreshPrice}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Refresh Price
          </button>
          <button
            onClick={reconnectWs}
            disabled={wsConnected}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            Reconnect Live
          </button>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-500">
        Stock Exchange Platform
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-gray-900 mb-3">Navigation</h2>
          <nav className="space-y-2">
            <a
              href="/"
              className="block p-2 text-gray-900 rounded hover:bg-gray-100 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/portfolio"
              className="block p-2 text-gray-900 rounded hover:bg-gray-100 transition-colors"
            >
              Portfolio
            </a>
            <a
              href="/orders"
              className="block p-2 text-gray-900 rounded hover:bg-gray-100 transition-colors"
            >
              Orders
            </a>
            <a
              href="/watchlist"
              className="block p-2 text-gray-900 rounded hover:bg-gray-100 transition-colors"
            >
              Watchlist
            </a>
          </nav>
          <hr className="my-4" />
          <PortfolioSummary
            userId={DEFAULT_USER_ID}
            refreshTrigger={portfolioRefreshCounter}
          />
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Stock Search Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold text-gray-900 mb-3">Stock Lookup</h2>
            <SymbolSearch onSymbolSelect={setSymbol} initialSymbol={symbol} />
          </div>

          {/* Price Display Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl mb-2 text-gray-900">{symbol}</h2>
            {loading ? (
              <div className="animate-pulse text-gray-700">
                Loading stock data...
              </div>
            ) : (
              renderPrice()
            )}
          </div>

          {/* Enhanced Stock Chart with centralized metrics */}
          <StockChart
            chartData={chartData}
            loading={loading}
            error={error}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            // Pass centralized timeframe metrics to chart for consistency
            timeframeStartPrice={currentTimeframeStartPrice}
            timeframeChangeMetrics={timeframeChangeMetrics}
          />

          {/* Trading Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setOrderAction("BUY");
                setOrderModalOpen(true);
              }}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Buy {symbol}
            </button>
            <button
              onClick={() => {
                setOrderAction("SELL");
                setOrderModalOpen(true);
              }}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Sell {symbol}
            </button>
          </div>

          {/* Portfolio Holdings Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibent text-gray-900 mb-3">Your Portfolio</h2>
            <HoldingsTable
              userId={DEFAULT_USER_ID}
              refreshTrigger={portfolioRefreshCounter}
            />
          </div>
        </div>
      </div>

      {/* Order Entry Modal */}
      {stockPrice && (
        <OrderForm
          isOpen={orderModalOpen}
          onClose={handleOrderComplete}
          symbol={symbol}
          action={orderAction}
          initialPrice={currentPrice || stockPrice.price}
          userId={DEFAULT_USER_ID}
        />
      )}
    </main>
  );
}
