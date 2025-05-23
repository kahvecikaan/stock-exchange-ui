"use client";

import { useState, useEffect } from "react";
import { userApi } from "@/services/api";

interface HoldingsTableProps {
  userId: number;
  refreshTrigger?: number;
}

export default function HoldingsTable({
  userId,
  refreshTrigger = 0,
}: HoldingsTableProps) {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getUserPortfolio(userId);
      setHoldings(data.holdings || []);
    } catch (err) {
      console.error("Error fetching holdings:", err);
      setError("Unable to load holdings data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on initial load and when refreshTrigger changes
  useEffect(() => {
    fetchHoldings();
  }, [userId, refreshTrigger]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-200 rounded w-full"></div>
        <div className="h-24 bg-gray-100 rounded w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 rounded-md border border-red-100">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchHoldings}
          className="text-xs text-red-700 underline mt-1"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="p-6 bg-blue-50 rounded-md text-center">
        <p className="text-blue-700 font-medium">
          No holdings in your portfolio yet
        </p>
        <p className="text-sm text-blue-600 mt-1">
          Start trading to build your portfolio!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Symbol
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Quantity
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Avg Price
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Current Price
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Current Value
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Profit/Loss
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {holdings.map((holding) => {
            const profitLossPercent = parseFloat(holding.profitLossPercentage);
            const isProfitable = profitLossPercent > 0;

            return (
              <tr key={holding.symbol} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {holding.symbol}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                  {parseFloat(holding.quantity).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                  ${parseFloat(holding.avgPrice).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${parseFloat(holding.currentPrice).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${parseFloat(holding.currentValue).toFixed(2)}
                </td>
                <td
                  className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                    isProfitable ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${parseFloat(holding.profitLoss).toFixed(2)} (
                  {profitLossPercent.toFixed(2)}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
