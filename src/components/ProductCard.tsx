import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: product.hero ? "1px solid rgba(196,151,59,0.35)" : "1px solid rgba(196,151,59,0.1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {product.hero && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#C4973B",
            background: "rgba(196,151,59,0.15)",
            padding: "4px 10px",
            borderRadius: 20,
            fontWeight: 700,
          }}
        >
          Hero SKU
        </div>
      )}
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(196,151,59,0.7)", marginBottom: 6, fontWeight: 600 }}>
        {product.category}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#E8E0D4", marginBottom: 6, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
        {product.name}
      </div>
      <div style={{ fontSize: 13, color: "rgba(232,224,212,0.6)", lineHeight: 1.5, marginBottom: 10 }}>
        {product.description}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#C4973B", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          {product.price}
        </span>
        <span style={{ fontSize: 11, color: "rgba(232,224,212,0.65)", letterSpacing: "0.05em" }}>
          {product.sku}
        </span>
      </div>
    </div>
  );
}
