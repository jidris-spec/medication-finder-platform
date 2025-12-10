// src/utils/stockUtils.js

// Turn a stock number into a human-friendly label
export function getStockLabel(stock) {
  if (stock === 0) return "Out of stock";
  if (stock <= 5) return "Low stock";
  return `${stock} in stock`;
}

// Return style object for stock badge based on stock level
export function getStockStyles(stock) {
  if (stock === 0) {
    return {
      backgroundColor: "rgba(239,68,68,0.14)",
      color: "#f97373",
      border: "1px solid rgba(248,113,113,0.6)",
    };
  }

  if (stock <= 5) {
    return {
      backgroundColor: "rgba(250,204,21,0.12)",
      color: "#facc15",
      border: "1px solid rgba(250,204,21,0.55)",
    };
  }

  return {
    backgroundColor: "rgba(34,197,94,0.14)",
    color: "#4ade80",
    border: "1px solid rgba(74,222,128,0.55)",
  };
}
