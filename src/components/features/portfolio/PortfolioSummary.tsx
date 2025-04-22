"use client";

import { useState, useEffect } from "react";
import { userApi } from "@/services/api";

interface PortfolioSummaryProps {
  userId: number;
  refreshTrigger?: number;
}

// Improved currency formatter for better display
function formatCurrency(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // For very large numbers (millions)
  if (numValue >= 1000000) {
    return `$${(numValue / 1000000).toFixed(2)}M`;
  }
  // For large numbers (thousands)
  else if (numValue >= 10000) {
    return `$${(numValue / 1000).toFixed(1)}K`;
  }
  // For regular numbers, show full value with 2 decimal places
  return `$${numValue.toFixed(2)}`;
}

export default function PortfolioSummary({
  userId,
  refreshTrigger = 0,
}: PortfolioSummaryProps) {
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getUserPortfolio(userId);
      setPortfolioData(data);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError("Unable to load portfolio data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolioData();
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [userId, refreshTrigger]);

  if (loading && !refreshing) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <div className="p-3 bg-red-50 rounded-md border border-red-100">
        <p className="text-sm text-red-600 font-medium">
          {error || "Portfolio data unavailable"}
        </p>
        <button
          onClick={fetchPortfolioData}
          className="text-xs text-red-700 underline mt-1 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* User ID and Name */}
      <div className="text-sm font-medium text-gray-800">
        User ID: {portfolioData.userId}
        {portfolioData.username && ` (${portfolioData.username})`}
      </div>

      {/* Financial summary with fixed sizing */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-md border border-gray-200">
          <div className="text-xs font-medium text-gray-600">Cash Balance</div>
          <div
            className="font-bold text-lg text-green-600 overflow-visible"
            title={`$${parseFloat(portfolioData.cashBalance).toFixed(2)}`}
          >
            {formatCurrency(portfolioData.cashBalance)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-gray-200">
          <div className="text-xs font-medium text-gray-600">
            Portfolio Value
          </div>
          <div
            className="font-bold text-lg text-blue-600 overflow-visible"
            title={`$${parseFloat(portfolioData.portfolioValue).toFixed(2)}`}
          >
            {formatCurrency(portfolioData.portfolioValue)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-gray-200">
          <div className="text-xs font-medium text-gray-600">Total Assets</div>
          <div
            className="font-bold text-lg text-gray-900 overflow-visible"
            title={`$${parseFloat(portfolioData.totalValue).toFixed(2)}`}
          >
            {formatCurrency(portfolioData.totalValue)}
          </div>
        </div>
      </div>

      {/* Refresh button with icon */}
      <div className="text-right">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
