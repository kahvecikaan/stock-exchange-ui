"use client";

import { useState, useEffect, useRef } from "react";
import { orderApi, stockApi } from "@/services/api";
import { OrderRequest } from "@/types";

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  action: "BUY" | "SELL";
  initialPrice: number;
  userId: number;
}

export default function OrderForm({
  isOpen,
  onClose,
  symbol,
  action,
  initialPrice,
  userId,
}: OrderFormProps) {
  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // State management for form
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [priceLastUpdated, setPriceLastUpdated] = useState(new Date());
  const [isPriceStale, setIsPriceStale] = useState(false);

  // Modal state tracking
  const openTimeRef = useRef(new Date());

  // Estimated total calculation
  const estimatedTotal =
    quantity * (orderType === "LIMIT" ? Number(limitPrice || 0) : currentPrice);

  // Check if price is stale (older than 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const priceAge = (now.getTime() - priceLastUpdated.getTime()) / 1000;
      setIsPriceStale(priceAge > 30);
    }, 5000);

    return () => clearInterval(interval);
  }, [priceLastUpdated]);

  // Handle refreshing the price
  const refreshPrice = async () => {
    try {
      setLoading(true);
      const priceData = await stockApi.getCurrentPrice(symbol);
      setCurrentPrice(priceData.price);
      setPriceLastUpdated(new Date());
      setIsPriceStale(false);
    } catch (err) {
      setError("Failed to refresh price. Using last known price.");
    } finally {
      setLoading(false);
    }
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    try {
      setLoading(true);

      // First refresh the price one final time
      await refreshPrice();

      // Then submit the order
      const orderData: OrderRequest = {
        userId,
        symbol,
        side: action,
        orderType,
        quantity: Number(quantity),
        price: orderType === "LIMIT" ? Number(limitPrice) : undefined,
      };

      console.log("Submitting order:", orderData);
      const result = await orderApi.placeOrder(orderData);
      console.log("Order result:", result);

      setSuccess(true);
      setStep(4); // Move to result step
    } catch (err) {
      console.error("Order submission error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to place order. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Render different steps based on current step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Select Order Type
            </h3>
            <div className="flex space-x-4">
              <button
                className={`flex-1 py-3 px-4 rounded-md font-medium ${
                  orderType === "MARKET"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => setOrderType("MARKET")}
              >
                Market Order
              </button>
              <button
                className={`flex-1 py-3 px-4 rounded-md font-medium ${
                  orderType === "LIMIT"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => setOrderType("LIMIT")}
              >
                Limit Order
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                <strong>Market Order:</strong> Executes immediately at the
                current market price.
              </p>
              <p>
                <strong>Limit Order:</strong> Executes only when the stock
                reaches your specified price or better.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Order Details</h3>

            {/* Price information section */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Current Price
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ${currentPrice.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={refreshPrice}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 focus:outline-none"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {priceLastUpdated.toLocaleTimeString()}
                {isPriceStale && (
                  <span className="text-amber-600 ml-1">
                    ⚠️ Price may be stale
                  </span>
                )}
              </p>
            </div>

            {/* Quantity input */}
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700"
              >
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 0))
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Limit price input (for limit orders) */}
            {orderType === "LIMIT" && (
              <div>
                <label
                  htmlFor="limitPrice"
                  className="block text-sm font-medium text-gray-700"
                >
                  Limit Price ($)
                </label>
                <input
                  type="number"
                  id="limitPrice"
                  min="0.01"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Order total estimate */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-800">Estimated Total:</span>
                <span className="text-gray-900">
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Confirm Your Order
            </h3>

            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Action:</span>
                <span className="font-medium text-gray-900">
                  {action === "BUY" ? "Buy" : "Sell"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">Symbol:</span>
                <span className="font-medium text-gray-900">{symbol}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">Order Type:</span>
                <span className="font-medium text-gray-900">
                  {orderType === "MARKET" ? "Market" : "Limit"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">Quantity:</span>
                <span className="font-medium text-gray-900">
                  {quantity} shares
                </span>
              </div>

              {orderType === "LIMIT" && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Limit Price:</span>
                  <span className="font-medium text-gray-900">
                    ${limitPrice}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-700">Total Amount:</span>
                <span className="font-medium text-gray-900">
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {isPriceStale && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-start">
                <div className="flex-shrink-0 mt-0.5">⚠️</div>
                <div className="ml-2">
                  <p className="font-medium">
                    Price information may be outdated
                  </p>
                  <p className="text-sm">
                    Current market conditions may have changed since the last
                    price update.
                  </p>
                  <button
                    onClick={refreshPrice}
                    disabled={loading}
                    className="mt-1 text-sm font-medium text-amber-800 underline"
                  >
                    Refresh price before continuing
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 text-center">
            {success ? (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Order Placed Successfully
                </h3>
                <p className="text-gray-600">
                  Your {orderType.toLowerCase()} order to {action.toLowerCase()}{" "}
                  {quantity} shares of {symbol} has been placed.
                </p>
                {orderType === "LIMIT" && (
                  <p className="text-gray-600">
                    Your order will execute when the price reaches ${limitPrice}
                    .
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Order Failed
                </h3>
                <p className="text-gray-600">
                  {error ||
                    "There was an error processing your order. Please try again."}
                </p>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {action === "BUY" ? "Buy" : "Sell"} {symbol}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress steps */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : step > s
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step > s ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
                <div className="text-xs mt-1 text-gray-500">
                  {s === 1 && "Type"}
                  {s === 2 && "Details"}
                  {s === 3 && "Confirm"}
                  {s === 4 && "Result"}
                </div>
              </div>
            ))}
          </div>
          <div className="relative mt-1 mb-4">
            <div className="absolute h-0.5 bg-gray-200 w-full"></div>
            <div
              className="absolute h-0.5 bg-blue-600 transition-all"
              style={{ width: `${(step - 1) * 33.33}%` }}
            ></div>
          </div>
        </div>

        {/* Step content */}
        <div className="mb-6">{renderStepContent()}</div>

        {/* Footer with navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              Back
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              disabled={step === 2 && orderType === "LIMIT" && !limitPrice}
            >
              Continue
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmitOrder}
              disabled={loading}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-blue-300"
            >
              {loading ? "Processing..." : "Place Order"}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
