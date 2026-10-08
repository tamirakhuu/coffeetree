import { shapeProduct } from "../api.js";
import { compareProductNames } from "./products.js";

export function applyProductChange(products, payload) {
  if (payload.eventType === "DELETE") {
    return products.filter(product => String(product.id) !== String(payload.old.id));
  }
  if (!["INSERT", "UPDATE"].includes(payload.eventType) || payload.new?.id == null) return products;
  const product = shapeProduct(payload.new);
  return [...products.filter(item => String(item.id) !== String(product.id)), product].sort(compareProductNames);
}
