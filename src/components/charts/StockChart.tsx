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
import { useState, useEffect, useRef, useMemo } from "react";

interface StockChartProps {
  chartData: ChartData | null;
  loading?: boolean;
  error?: string | null;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  timeframeStartPrice?: number;
  timeframeChangeMetrics?: {
    priceChange: number;
    percentChange: number;
    isPriceUp: boolean;
  };
}

const StockChart = ({
  chartData,
  loading,
  error,
  timeframe,
  onTimeframeChange,
  timeframeStartPrice = 0, // Default values for backward compatibility
  timeframeChangeMetrics = {
    priceChange: 0,
    percentChange: 0,
    isPriceUp: false,
  },
}: StockChartProps) => {
  // Simplified state management - focus on chart presentation, not business logic
  const [displayedPointCount, setDisplayedPointCount] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [wasUpdated, setWasUpdated] = useState(false);

  // Refs for managing timers and tracking data changes
  const drawingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevChartDataRef = useRef<ChartData | null>(null);

  // Optimized configuration for smooth sketching animation
  const SKETCHING_CONFIG = {
    POINTS_PER_STEP: 6, // Points to add each animation step
    STEP_INTERVAL: 25, // Milliseconds between steps (40fps for smooth motion)
    INITIAL_POINTS: 8, // Start with this many points visible
    ENABLE_FOR_TIMEFRAMES: ["1d", "1w", "1m"], // Which timeframes get animation
    MIN_POINTS_FOR_ANIMATION: 20, // Don't animate very small datasets
    MAX_POINTS_FOR_ANIMATION: 300, // Don't animate very large datasets for performance
  };

  // Time period options
  const timeframeOptions = [
    { value: "1d", label: "1 Day" },
    { value: "1w", label: "1 Week" },
    { value: "1m", label: "1 Month" },
    { value: "3m", label: "3 Months" },
    { value: "1y", label: "1 Year" },
    { value: "5y", label: "5 Years" },
  ];

  // Helper function to determine if we should animate this dataset
  const shouldAnimate = (newChartData: ChartData | null): boolean => {
    if (!newChartData || !newChartData.labels) return false;

    const pointCount = newChartData.labels.length;
    const isEligibleTimeframe =
      SKETCHING_CONFIG.ENABLE_FOR_TIMEFRAMES.includes(timeframe);
    const hasAppropriateSize =
      pointCount >= SKETCHING_CONFIG.MIN_POINTS_FOR_ANIMATION &&
      pointCount <= SKETCHING_CONFIG.MAX_POINTS_FOR_ANIMATION;

    return isEligibleTimeframe && hasAppropriateSize;
  };

  // Simplified effect for handling chart data changes and animation - no more business logic
  useEffect(() => {
    // Clear any existing drawing timer
    if (drawingTimerRef.current) {
      clearTimeout(drawingTimerRef.current);
      drawingTimerRef.current = null;
    }

    if (!chartData) {
      setDisplayedPointCount(0);
      setIsDrawing(false);
      prevChartDataRef.current = chartData;
      return;
    }

    // Determine what type of data change this is for animation purposes only
    const isWebSocketUpdate =
      prevChartDataRef.current &&
      chartData.labels &&
      prevChartDataRef.current.labels &&
      chartData.labels.length > prevChartDataRef.current.labels.length &&
      chartData.labels.length - prevChartDataRef.current.labels.length <= 3; // Only a few new points

    if (isWebSocketUpdate) {
      // This is a live update - extend the chart smoothly without animation
      setDisplayedPointCount(chartData.labels?.length || 0);
      setWasUpdated(true);

      // Clear the update indicator after a brief moment
      const timer = setTimeout(() => setWasUpdated(false), 1500);

      prevChartDataRef.current = chartData;
      return () => clearTimeout(timer);
    } else {
      // This is a full data refresh - potentially animate the sketching
      if (shouldAnimate(chartData)) {
        // Start the progressive sketching animation
        setIsDrawing(true);
        setDisplayedPointCount(SKETCHING_CONFIG.INITIAL_POINTS);

        // Set up the progressive revealing mechanism
        const startSketchingAnimation = () => {
          const totalPoints = chartData.labels?.length || 0;
          let currentPoints = SKETCHING_CONFIG.INITIAL_POINTS;

          const addMorePoints = () => {
            if (currentPoints >= totalPoints) {
              // Animation complete - show all points and stop
              setIsDrawing(false);
              setDisplayedPointCount(totalPoints);
              return;
            }

            // Add more points for the next animation step
            currentPoints = Math.min(
              currentPoints + SKETCHING_CONFIG.POINTS_PER_STEP,
              totalPoints
            );
            setDisplayedPointCount(currentPoints);

            // Schedule the next animation step
            drawingTimerRef.current = setTimeout(
              addMorePoints,
              SKETCHING_CONFIG.STEP_INTERVAL
            );
          };

          // Start the progressive revelation immediately
          addMorePoints();
        };

        startSketchingAnimation();
      } else {
        // No animation for this timeframe/dataset - show all points immediately
        setDisplayedPointCount(chartData.labels?.length || 0);
        setIsDrawing(false);
      }

      prevChartDataRef.current = chartData;
    }
  }, [chartData, timeframe]); // Removed timeframe-specific dependencies since parent handles that

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (drawingTimerRef.current) {
        clearTimeout(drawingTimerRef.current);
      }
    };
  }, []);

  const { displayedData, allDataForCalculations, yAxisDomain, chartColor } =
    useMemo(() => {
      if (!chartData || !chartData.datasets || !chartData.labels) {
        return {
          displayedData: [],
          allDataForCalculations: [],
          yAxisDomain: [0, 100],
          chartColor: "#3b82f6",
        };
      }

      // Create the complete dataset with all original information for stable calculations
      const allData = chartData.labels.map((label, index) => ({
        name: label, // Original timestamp for tooltips
        Price: chartData.datasets.Price ? chartData.datasets.Price[index] : 0,
        index: index, // Index for X-axis positioning
      }));

      // Create the displayed dataset (truncated during animation, complete when finished)
      const actualDisplayCount = Math.min(displayedPointCount, allData.length);
      const displayed = allData.slice(0, actualDisplayCount);

      // Validate price data for Y-axis domain calculation
      const validPrices = allData.filter(
        (item) => item.Price && !isNaN(item.Price) && item.Price > 0
      );

      // Calculate Y-axis domain using ALL data to prevent vertical shifting during animation
      let yDomainMin = 0;
      let yDomainMax = 100;

      if (validPrices.length > 0) {
        const priceValues = validPrices.map((item) => item.Price);
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const priceRange = maxPrice - minPrice;

        // Add 8% padding for visual spacing
        const pricePadding = Math.max(priceRange * 0.08, maxPrice * 0.02);
        yDomainMin = Math.max(0, minPrice - pricePadding);
        yDomainMax = maxPrice + pricePadding;
      }

      // Use centralized timeframe change metrics for line color (from parent)
      const lineColor = timeframeChangeMetrics.isPriceUp
        ? "#22c55e"
        : "#ef4444";

      return {
        displayedData: displayed,
        allDataForCalculations: allData,
        yAxisDomain: [yDomainMin, yDomainMax],
        chartColor: lineColor,
      };
    }, [chartData, displayedPointCount, timeframeChangeMetrics.isPriceUp]); // Use parent-managed metrics

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow">
        <div className="animate-pulse text-gray-700">Loading chart data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  // No data state
  if (!chartData || !chartData.datasets || !chartData.labels) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow">
        <div className="text-gray-700 font-medium">No chart data available</div>
      </div>
    );
  }

  // Extract symbol from title for display
  const symbolMatch = chartData.title.match(/^([A-Z]+)/);
  const symbol = symbolMatch ? symbolMatch[1] : "";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentPrice = payload[0].value;
      // Calculate change relative to the centralized timeframe starting price
      const pointPriceChange =
        timeframeStartPrice > 0 ? currentPrice - timeframeStartPrice : 0;
      const pointPercentChange =
        timeframeStartPrice > 0
          ? (pointPriceChange / timeframeStartPrice) * 100
          : 0;

      const isPositive = pointPriceChange >= 0;
      const changeColor = isPositive ? "#22c55e" : "#ef4444";
      const changeSign = isPositive ? "+" : "";

      return (
        <div className="bg-white p-4 border border-gray-300 shadow-lg rounded-md">
          {/* Display the full timestamp information */}
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
    <div
      className={`bg-white rounded-lg shadow-md p-5 transition-all duration-300 ${
        wasUpdated ? "ring-2 ring-blue-400 ring-opacity-50" : ""
      }`}
    >
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-3xl font-bold text-gray-900">{symbol}</h3>
          <p className="text-sm font-medium text-gray-700">
            {chartData.title.replace(symbol, "").trim()}
          </p>
          {/* Price change display using centralized metrics - no duplicate calculations */}
          {timeframeChangeMetrics.priceChange !== 0 && (
            <p
              className={`text-sm font-medium ${
                timeframeChangeMetrics.isPriceUp
                  ? "text-green-600"
                  : "text-red-600"
              } mt-1`}
            >
              {timeframeChangeMetrics.isPriceUp ? "+" : ""}
              {timeframeChangeMetrics.priceChange.toFixed(2)} (
              {timeframeChangeMetrics.isPriceUp ? "+" : ""}
              {timeframeChangeMetrics.percentChange.toFixed(2)}%)
            </p>
          )}
        </div>

        {/* Timeframe selection buttons - always enabled for immediate responsiveness */}
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

      {/* Chart container with stable dimensions */}
      <div className="h-80 relative">
        {/* Status indicators for drawing progress and live updates */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {isDrawing && (
            <div className="px-2 py-1 bg-purple-500 text-white text-xs rounded">
              Drawing Chart...
            </div>
          )}
          {wasUpdated && (
            <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded animate-pulse">
              Live Update
            </div>
          )}
        </div>

        {/* Main chart with clean presentation */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayedData} // Progressive data revelation during animation
            margin={{ top: 10, right: 35, left: 20, bottom: 10 }} // Reduced bottom margin since no labels
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />

            {/* Clean X-axis without labels - timestamps available via tooltips */}
            <XAxis
              dataKey="name" // Use original timestamps for proper tooltip information
              tick={false} // Hide labels for clean appearance
              tickLine={false} // Clean appearance without tick marks
              axisLine={{ stroke: "#4b5563" }} // Just the axis line for visual reference
              height={20} // Minimal height since no labels needed
            />

            {/* Y-axis with stable domain calculated from complete dataset */}
            <YAxis
              domain={yAxisDomain} // Stable domain to prevent shifting during animation
              tick={{ fontSize: 13, fill: "#111827", fontWeight: 500 }}
              tickLine={{ stroke: "#4b5563" }}
              axisLine={{ stroke: "#4b5563" }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              width={70}
            />

            {/* Tooltip provides comprehensive information using centralized metrics */}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: "10px",
                fontSize: "15px",
                fontWeight: "bold",
                color: "#111827",
              }}
            />

            {/* Reference line using centralized timeframe starting price */}
            <ReferenceLine
              y={timeframeStartPrice}
              stroke="#4b5563"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `$${timeframeStartPrice.toFixed(2)}`,
                position: "left",
                fill: "#111827",
                fontSize: 12,
                fontWeight: "bold",
                offset: 10,
              }}
            />

            {/* Main price line using centralized color determination */}
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
              connectNulls={false}
              animationDuration={0} // Disable built-in animations for precise control
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over any point to see detailed timestamp and price information
      </div>
    </div>
  );
};

export default StockChart;
