"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartData } from "@/types";
import { useMemo } from "react";

interface StockChartProps {
  chartData: ChartData | null;
  loading?: boolean;
  error?: string | null;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

const StockChart = ({
  chartData,
  loading,
  error,
  timeframe,
  onTimeframeChange,
}: StockChartProps) => {
  // Time period options - Added 5y option
  const timeframeOptions = [
    { value: "1d", label: "1 Day" },
    { value: "1w", label: "1 Week" },
    { value: "1m", label: "1 Month" },
    { value: "3m", label: "3 Months" },
    { value: "1y", label: "1 Year" },
    { value: "5y", label: "5 Years" },
  ];

  // Loading and error states (unchanged)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow">
        <div className="animate-pulse text-gray-700">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  if (!chartData || !chartData.datasets || !chartData.labels) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow">
        <div className="text-gray-700 font-medium">No chart data available</div>
      </div>
    );
  }

  // Data transformation
  const data = chartData.labels.map((label, index) => {
    return {
      name: label,
      Price: chartData.datasets.Price ? chartData.datasets.Price[index] : 0,
      index: index,
    };
  });

  // Calculate price metrics
  const startingPrice = data[0]?.Price || 0;
  const lastPrice = data[data.length - 1]?.Price || 0;
  const priceChange = lastPrice - startingPrice;
  const percentChange =
    startingPrice !== 0 ? (priceChange / startingPrice) * 100 : 0;
  const isPriceUp = priceChange >= 0;

  // Determine chart color based on price movement (green for up, red for down)
  const chartColor = isPriceUp ? "#22c55e" : "#ef4444"; // Green or Red

  const priceValues = data
    .map((item) => item.Price)
    .filter((price) => !isNaN(price));
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const pricePadding = (maxPrice - minPrice) * 0.1;

  // Extract symbol from title
  const symbolMatch = chartData.title.match(/^([A-Z]+)/);
  const symbol = symbolMatch ? symbolMatch[1] : "";

  // Enhanced tooltip with better visibility
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentPrice = payload[0].value;
      const pointPriceChange = currentPrice - startingPrice;
      const pointPercentChange =
        startingPrice !== 0 ? (pointPriceChange / startingPrice) * 100 : 0;

      const isPositive = pointPriceChange >= 0;
      const changeColor = isPositive ? "#22c55e" : "#ef4444"; // Using hex for consistency
      const changeSign = isPositive ? "+" : "";

      return (
        <div className="bg-white p-4 border border-gray-300 shadow-lg rounded-md">
          <p className="font-bold text-base mb-2 text-gray-900">{label}</p>
          <p className="text-base font-medium text-gray-900">
            Price:{" "}
            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
              ${currentPrice.toFixed(2)}
            </span>
          </p>
          <p className="text-base font-medium" style={{ color: changeColor }}>
            Change: {changeSign}
            {pointPriceChange.toFixed(2)} ({changeSign}
            {pointPercentChange.toFixed(2)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-3xl font-bold text-gray-900">{symbol}</h3>
          <p className="text-sm font-medium text-gray-700">
            {chartData.title.replace(symbol, "").trim()}
          </p>
          {/* Add price change summary */}
          <p
            className={`text-sm font-medium ${
              isPriceUp ? "text-green-600" : "text-red-600"
            } mt-1`}
          >
            {isPriceUp ? "+" : ""}
            {priceChange.toFixed(2)} ({isPriceUp ? "+" : ""}
            {percentChange.toFixed(2)}%)
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {timeframeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeframeChange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeframe === option.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 35, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#111827", fontWeight: 500 }}
              tickLine={{ stroke: "#4b5563" }}
              axisLine={{ stroke: "#4b5563" }}
              padding={{ left: 10, right: 10 }}
              angle={timeframe === "1w" ? -30 : 0} // Rotate labels for weekly chart
              height={60}
              textAnchor={timeframe === "1w" ? "end" : "middle"}
            />
            <YAxis
              domain={[minPrice - pricePadding, maxPrice + pricePadding]}
              tick={{ fontSize: 13, fill: "#111827", fontWeight: 500 }}
              tickLine={{ stroke: "#4b5563" }}
              axisLine={{ stroke: "#4b5563" }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: "10px",
                fontSize: "15px",
                fontWeight: "bold",
                color: "#111827",
              }}
            />

            {/* Enhanced reference line */}
            <ReferenceLine
              y={startingPrice}
              stroke="#4b5563"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `$${startingPrice.toFixed(2)}`,
                position: "right",
                fill: "#111827",
                fontSize: 12,
                fontWeight: "bold",
              }}
            />

            {/* Price line - color changes based on price movement */}
            <Line
              type="monotone"
              dataKey="Price"
              name="Price"
              stroke={chartColor}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: chartColor,
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockChart;
