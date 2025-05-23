"use client";

import { useState, useEffect, useRef } from "react";
import { stockApi } from "@/services/api";

interface SymbolSearchProps {
  onSymbolSelect: (symbol: string) => void;
  initialSymbol?: string;
}

const SymbolSearch = ({
  onSymbolSelect,
  initialSymbol = "AAPL",
}: SymbolSearchProps) => {
  const [searchTerm, setSearchTerm] = useState(initialSymbol);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Refs for managing component interactions
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced search with debouncing for better performance
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1); // Reset selection when typing

    // Clear previous timeout to debounce the search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Hide results immediately if search term is too short
    if (value.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    // Show loading state immediately for better UX
    setIsSearching(true);
    setShowResults(true); // Show dropdown even while loading

    // Debounce the actual search to avoid too many API calls
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`Searching for: "${value}"`);
        const results = await stockApi.searchStocks(value);
        console.log(`Found ${results.length} results`);

        setSearchResults(results);
        setShowResults(true); // Ensure results are visible
      } catch (error) {
        console.error("Error searching stocks:", error);
        setSearchResults([]);
        setShowResults(true); // Still show dropdown to display "no results" message
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce delay
  };

  // Enhanced symbol selection with better state management
  const handleSymbolSelect = (symbol: string) => {
    console.log(`Selected symbol: ${symbol}`);
    setSearchTerm(symbol);
    setShowResults(false);
    setSelectedIndex(-1);
    onSymbolSelect(symbol);

    // Blur the input to hide mobile keyboard
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Enhanced form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If user has selected an item with keyboard, use that
    if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
      handleSymbolSelect(searchResults[selectedIndex].symbol);
    } else if (searchTerm.trim()) {
      // Otherwise use the typed term
      handleSymbolSelect(searchTerm.toUpperCase().trim());
    }

    setShowResults(false);
  };

  // Keyboard navigation for better accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSymbolSelect(searchResults[selectedIndex].symbol);
        } else {
          handleSubmit(e);
        }
        break;

      case "Escape":
        setShowResults(false);
        setSelectedIndex(-1);
        if (searchInputRef.current) {
          searchInputRef.current.blur();
        }
        break;
    }
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced focus handler to show existing results
  const handleInputFocus = () => {
    if (searchResults.length > 0 && searchTerm.length >= 2) {
      setShowResults(true);
    }
  };

  // Enhanced blur handler with delay to allow for clicks
  const handleInputBlur = () => {
    // Delay hiding results to allow for result clicks
    setTimeout(() => {
      setShowResults(false);
      setSelectedIndex(-1);
    }, 150);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Enter stock symbol (e.g., AAPL, TSLA, MSFT)"
            className={`
              border rounded-l px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all duration-200
              ${
                showResults && (searchResults.length > 0 || isSearching)
                  ? "focus:ring-blue-500 border-blue-300 bg-blue-50"
                  : "focus:ring-blue-500 border-gray-300"
              }
              ${
                searchTerm === initialSymbol
                  ? "text-blue-600 font-medium"
                  : "text-gray-900"
              }
            `}
          />

          {/* Enhanced loading indicator */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className={`
            px-4 py-2 rounded-r font-medium transition-all duration-200
            ${
              isSearching
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md"
            }
          `}
        >
          {isSearching ? "..." : "Search"}
        </button>
      </form>

      {/* Enhanced search results dropdown with better visibility */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto"
          style={{
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          {isSearching ? (
            // Loading state
            <div className="px-4 py-3 text-center text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                <span>Searching for "{searchTerm}"...</span>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            // Results found
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Found {searchResults.length} result
                {searchResults.length !== 1 ? "s" : ""}
              </div>
              {searchResults.map((result, index) => (
                <div
                  key={`${result.symbol}-${index}`}
                  className={`
                    px-4 py-3 cursor-pointer transition-all duration-150 border-l-4
                    ${
                      index === selectedIndex
                        ? "bg-blue-50 border-blue-500 text-blue-900"
                        : "hover:bg-gray-50 border-transparent hover:border-gray-300"
                    }
                  `}
                  onClick={() => handleSymbolSelect(result.symbol)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div
                        className={`
                        font-bold text-sm
                        ${
                          index === selectedIndex
                            ? "text-blue-700"
                            : "text-gray-900"
                        }
                      `}
                      >
                        {result.symbol}
                      </div>
                      <div
                        className={`
                        text-sm truncate
                        ${
                          index === selectedIndex
                            ? "text-blue-600"
                            : "text-gray-600"
                        }
                      `}
                      >
                        {result.name || "N/A"}
                      </div>
                    </div>
                    {result.price && (
                      <div
                        className={`
                        text-sm font-medium ml-2
                        ${
                          index === selectedIndex
                            ? "text-blue-700"
                            : "text-gray-700"
                        }
                      `}
                      >
                        $
                        {typeof result.price === "number"
                          ? result.price.toFixed(2)
                          : result.price}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // No results found
            <div className="px-4 py-6 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <div className="font-medium">No stocks found</div>
              <div className="text-sm">Try searching with a different term</div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced helper text with dynamic content */}
      <div className="mt-2 text-xs text-gray-500">
        {searchTerm.length === 0 && "Start typing to search for stocks"}
        {searchTerm.length > 0 &&
          searchTerm.length < 2 &&
          "Type at least 2 characters to search"}
        {showResults &&
          searchResults.length > 0 &&
          !isSearching &&
          "Use ↑↓ arrows to navigate, Enter to select"}
        {showResults && isSearching && "Searching..."}
      </div>
    </div>
  );
};

export default SymbolSearch;
