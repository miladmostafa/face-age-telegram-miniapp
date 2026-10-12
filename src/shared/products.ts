import sampleCatalog from "../../data/sample-products.json";

export interface ProductVariableOption {
  label: string;
  value: string;
  price?: number;
  offerPrice?: number;
}

export interface ProductVariable {
  title: string;
  option: ProductVariableOption[];
}

export interface CatalogProduct {
  id: string;
  url: string;
  image: string;
  title: string;
  description?: string;
  price: number;
  offerPrice?: number;
  problems?: string[];
  routineGroups?: Record<string, string[]>;
  variables?: Record<string, ProductVariable>;
}

export interface ShopCatalog {
  shopName: string;
  currency: string;
  products: CatalogProduct[];
}

export function loadSampleCatalog(): ShopCatalog {
  return sampleCatalog as ShopCatalog;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Turn catalog image paths into absolute URLs the widget can request. */
export function resolveCatalog(catalog: ShopCatalog, origin: string): ShopCatalog {
  return {
    ...catalog,
    products: catalog.products.map((product) => ({
      ...product,
      image: new URL(product.image, origin).toString(),
    })),
  };
}

export function assertCatalog(catalog: ShopCatalog): void {
  if (!catalog.shopName.trim()) throw new Error("Catalog shopName is required");
  if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
    throw new Error("Catalog products must be a non-empty array");
  }
  catalog.products.forEach((product, index) => {
    if (!product.id) throw new Error(`Product ${index} is missing an id`);
    if (!product.title.trim()) throw new Error(`Product ${product.id} is missing a title`);
    if (!isHttpUrl(product.url)) throw new Error(`Product ${product.id} needs an http(s) url`);
    if (typeof product.price !== "number" || product.price < 0) {
      throw new Error(`Product ${product.id} needs a non-negative price`);
    }
    if (product.offerPrice != null && (typeof product.offerPrice !== "number" || product.offerPrice < 0)) {
      throw new Error(`Product ${product.id} has an invalid offerPrice`);
    }
  });
}
