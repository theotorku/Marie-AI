import { render, screen } from "@testing-library/react";
import ProductCard from "./ProductCard";
import type { Product } from "../types";

const heroProduct: Product = {
  name: "Skin Blurring Balm",
  category: "Face",
  hero: true,
  description: "Cult-favorite setting powder.",
  price: "$38",
  sku: "MAI-BBP-001",
};

const regularProduct: Product = {
  ...heroProduct,
  name: "Lip Vinyl",
  hero: false,
};

describe("ProductCard", () => {
  it("renders product details", () => {
    render(<ProductCard product={heroProduct} />);
    expect(screen.getByText("Skin Blurring Balm")).toBeInTheDocument();
    expect(screen.getByText("Face")).toBeInTheDocument();
    expect(screen.getByText("$38")).toBeInTheDocument();
    expect(screen.getByText("MAI-BBP-001")).toBeInTheDocument();
  });

  it("shows Hero SKU badge for hero products", () => {
    render(<ProductCard product={heroProduct} />);
    expect(screen.getByText("Hero SKU")).toBeInTheDocument();
  });

  it("does not show Hero SKU badge for regular products", () => {
    render(<ProductCard product={regularProduct} />);
    expect(screen.queryByText("Hero SKU")).not.toBeInTheDocument();
  });
});
