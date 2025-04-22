"use client";

import { useState } from "react";
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

  // Handle search input change
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.length >= 2) {
      setIsSearching(true);
      try {
        const results = await stockApi.searchStocks(value);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching stocks:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    setSearchTerm(symbol);
    setShowResults(false);
    onSymbolSelect(symbol);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      onSymbolSelect(searchTerm.toUpperCase());
    }
    setShowResults(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Enter stock symbol (e.g., AAPL)"
          className="border rounded-l px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
        >
          Search
        </button>
      </form>

      {/* Search results dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSymbolSelect(result.symbol)}
            >
              <div className="font-medium">{result.symbol}</div>
              <div className="text-sm text-gray-600">{result.name}</div>
            </div>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="absolute right-12 top-3">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;
