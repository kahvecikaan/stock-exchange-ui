"use client";

import { useState, useEffect, useRef } from "react";
import { stockApi } from "@/services/api";
import StockChart from "@/components/charts/StockChart";
import SymbolSearch from "@/components/ui/SymbolSearch";
import OrderForm from "@/components/features/orders/OrderForm";
import { ChartData, StockPrice } from "@/types";

// For testing purposes, we'll use userId = 1
const DEFAULT_USER_ID = 1;

export default function HomePage() {
  // State variables
  const [symbol, setSymbol] = useState("ARM");
  const [timeframe, setTimeframe] = useState("1m");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [stockPrice, setStockPrice] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Order form state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderAction, setOrderAction] = useState<"BUY" | "SELL">("BUY");

  // Function to check if US market is open (basic version)
  const checkIfMarketOpen = () => {
    const now = new Date();
    const nyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );

    // Market is open Monday-Friday, 9:30 AM - 4:00 PM ET
    const day = nyTime.getDay();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Weekend check (0 = Sunday, 6 = Saturday)
    if (day === 0 || day === 6) return false;

    // Hours check (9:30 AM - 4:00 PM)
    if (hour < 9 || hour > 16) return false;
    if (hour === 9 && minute < 30) return false;

    return true;
  };

  // Function to fetch stock data
  const fetchStockData = async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);

      // Fetch data in parallel
      const [chartResponse, priceResponse] = await Promise.all([
        stockApi.getStockChart(symbol, timeframe),
        stockApi.getCurrentPrice(symbol),
      ]);

      setChartData(chartResponse);
      setStockPrice(priceResponse);

      // Check if market is open to determine refresh rate
      const marketOpen = checkIfMarketOpen();
      setIsMarketOpen(marketOpen);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please check if the backend is running.");
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  };

  // Initial data load and setup refresh timer
  useEffect(() => {
    // Initial data fetch
    fetchStockData();

    // Start refresh timer for price updates
    const setupRefreshTimer = () => {
      // Clear any existing timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }

      // Set up a timer that checks market status and updates price accordingly
      refreshTimerRef.current = setInterval(
        () => {
          const marketOpen = checkIfMarketOpen();
          setIsMarketOpen(marketOpen);

          // Refresh price data more frequently during market hours
          if (marketOpen) {
            // During market hours, update every 15 seconds
            stockApi
              .getCurrentPrice(symbol)
              .then(setStockPrice)
              .catch(console.error);
          }
        },
        isMarketOpen ? 15000 : 60000
      ); // 15 seconds during market hours, 1 minute otherwise
    };

    setupRefreshTimer();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []); // Empty dependency array for initial setup only

  // Fetch data when symbol or timeframe changes
  useEffect(() => {
    fetchStockData();

    // Also reset the refresh timer when symbol changes
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(
      () => {
        const marketOpen = checkIfMarketOpen();
        if (marketOpen) {
          stockApi
            .getCurrentPrice(symbol)
            .then(setStockPrice)
            .catch(console.error);
        }
      },
      isMarketOpen ? 15000 : 60000
    );

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [symbol, timeframe]);

  // Handle symbol selection from the search component
  const handleSymbolSelect = (newSymbol: string) => {
    setSymbol(newSymbol);
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  // Handle buy button click
  const handleBuyClick = () => {
    setOrderAction("BUY");
    setOrderModalOpen(true);
  };

  // Handle sell button click
  const handleSellClick = () => {
    setOrderAction("SELL");
    setOrderModalOpen(true);
  };

  // Format price with color based on change
  const renderPrice = () => {
    if (!stockPrice) return null;

    const isPositive = stockPrice.changePercent && stockPrice.changePercent > 0;
    const isNegative = stockPrice.changePercent && stockPrice.changePercent < 0;

    const changeColor = isPositive
      ? "text-green-600"
      : isNegative
      ? "text-red-600"
      : "text-gray-600";

    const lastUpdatedISO = stockPrice.zonedTimestamp ?? stockPrice.timestamp;

    console.log(
      "Raw timestamp data:",
      stockPrice.zonedTimestamp,
      stockPrice.timestamp
    );

    // Calculate how old the data is
    const dataTimestamp = new Date(lastUpdatedISO);
    const now = new Date();
    const dataAgeHours =
      (now.getTime() - dataTimestamp.getTime()) / (1000 * 60 * 60);
    const isStale = isMarketOpen && dataAgeHours > 1;

    // Format the updated time with seconds for better visibility of refreshes
    const lastUpdated = new Date(lastUpdatedISO).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return (
      <div className="mb-4">
        <div className="flex items-baseline">
          <h2 className="text-3xl font-bold text-gray-900">
            ${stockPrice.price.toFixed(2)}
          </h2>
          {stockPrice.changePercent && (
            <span className={`ml-2 ${changeColor} text-lg font-semibold`}>
              {stockPrice.change && stockPrice.change > 0 ? "+" : ""}
              {stockPrice.change?.toFixed(2)} (
              {stockPrice.changePercent.toFixed(2)}%)
            </span>
          )}

          {/* Add market status indicator */}
          <span
            className="ml-3 px-2 py-1 text-xs rounded-full font-medium"
            style={{
              backgroundColor: isMarketOpen ? "#dcfce7" : "#fee2e2",
              color: isMarketOpen ? "#166534" : "#991b1b",
            }}
          >
            {isMarketOpen ? "Market Open" : "Market Closed"}
          </span>
        </div>
        <div className="text-sm font-medium text-gray-800 mt-1">
          Last updated: {lastUpdated}
        </div>

        {/* Add data age warning */}
        {isStale && (
          <div className="mt-2 text-amber-600 text-sm flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Data may be delayed by {Math.round(dataAgeHours)} hours
          </div>
        )}

        {/* Improved manual refresh button with stronger contrast and explicit function binding */}
        <button
          onClick={() => {
            console.log("Manual refresh button clicked");
            fetchStockData(true);
          }}
          className="mt-3 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium flex items-center shadow-sm text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          Refresh Price
        </button>
      </div>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Stock Exchange Platform
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Sidebar with option links */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Navigation
          </h2>
          <nav className="space-y-2">
            <a
              href="/"
              className="block p-2 rounded bg-blue-100 text-blue-800 font-medium"
            >
              Dashboard
            </a>
            <a
              href="/portfolio"
              className="block p-2 rounded hover:bg-gray-100 text-gray-700 font-medium"
            >
              Portfolio
            </a>
            <a
              href="/orders"
              className="block p-2 rounded hover:bg-gray-100 text-gray-700 font-medium"
            >
              Orders
            </a>
            <a
              href="/watchlist"
              className="block p-2 rounded hover:bg-gray-100 text-gray-700 font-medium"
            >
              Watchlist
            </a>
          </nav>

          <hr className="my-4 border-gray-200" />

          {/* Improved account section with better contrast */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Account</h3>
            <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
              <div className="text-sm font-medium text-gray-800">
                User ID: {DEFAULT_USER_ID}
              </div>
              <div className="font-bold text-lg mt-1 text-gray-900">
                $10,000.00
              </div>
              <div className="text-xs font-medium text-gray-700">
                Available balance
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="md:col-span-3 space-y-6">
          {/* Symbol search */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              Stock Lookup
            </h2>
            <SymbolSearch
              onSymbolSelect={handleSymbolSelect}
              initialSymbol={symbol}
            />
          </div>

          {/* Stock price info */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-2 text-gray-800">
              {symbol}
            </h2>
            {loading ? (
              <div className="animate-pulse text-gray-500 font-medium">
                Loading price data...
              </div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              renderPrice()
            )}
          </div>

          {/* Stock chart */}
          <StockChart
            chartData={chartData}
            loading={loading}
            error={error}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
          />

          {/* Quick actions */}
          <div className="flex space-x-4">
            <button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium shadow-sm"
              onClick={handleBuyClick}
            >
              Buy {symbol}
            </button>
            <button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium shadow-sm"
              onClick={handleSellClick}
            >
              Sell {symbol}
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium shadow-sm">
              Add to Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* Order Form Modal */}
      {stockPrice && (
        <OrderForm
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          symbol={symbol}
          action={orderAction}
          initialPrice={stockPrice.price}
          userId={DEFAULT_USER_ID}
        />
      )}
    </main>
  );
}
