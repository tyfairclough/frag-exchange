import { InventoryKind, ListingIntent } from "@/generated/prisma/enums";

const SALE_URL_MAX_LENGTH = 2048;
const ALLOWED_SALE_SCHEMES = new Set(["http:", "https:"]);
const ISO_4217 = new Set(["GBP", "USD", "EUR", "AUD", "CAD", "NZD", "JPY"]);

export type ParsedSaleFields =
  | {
      listingIntent: ListingIntent;
      salePriceMinor: null;
      saleCurrencyCode: null;
      saleExternalUrl: null;
    }
  | {
      listingIntent: ListingIntent;
      salePriceMinor: number;
      saleCurrencyCode: string;
      saleExternalUrl: string;
    };

export type ParseListingIntentError =
  | "listing-intent"
  | "sale-kind"
  | "sale-price"
  | "sale-currency"
  | "sale-url";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function displayListingIntent(intent: ListingIntent): "swap" | "free" | "for_sale" {
  if (intent === ListingIntent.FREE) return "free";
  if (intent === ListingIntent.FOR_SALE) return "for_sale";
  return "swap";
}

export function parseListingIntentAndSaleFields(formData: FormData, kind: InventoryKind): ParsedSaleFields | ParseListingIntentError {
  const rawIntent = str(formData.get("listingIntent")).toUpperCase();
  const listingIntent =
    rawIntent === ListingIntent.FREE
      ? ListingIntent.FREE
      : rawIntent === ListingIntent.FOR_SALE
        ? ListingIntent.FOR_SALE
        : ListingIntent.SWAP;

  if (listingIntent !== ListingIntent.FOR_SALE) {
    return {
      listingIntent,
      salePriceMinor: null,
      saleCurrencyCode: null,
      saleExternalUrl: null,
    };
  }
  if (kind === InventoryKind.EQUIPMENT) {
    return "sale-kind";
  }

  const salePriceRaw = str(formData.get("salePrice"));
  const saleCurrencyRaw = str(formData.get("saleCurrency")).toUpperCase() || "GBP";
  const saleUrlRaw = str(formData.get("saleExternalUrl"));

  const salePrice = Number(salePriceRaw);
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return "sale-price";
  }
  const salePriceMinor = Math.round(salePrice * 100);
  if (!Number.isInteger(salePriceMinor) || salePriceMinor < 1) {
    return "sale-price";
  }
  if (!ISO_4217.has(saleCurrencyRaw)) {
    return "sale-currency";
  }
  if (!saleUrlRaw || saleUrlRaw.length > SALE_URL_MAX_LENGTH) {
    return "sale-url";
  }

  let parsed: URL;
  try {
    parsed = new URL(saleUrlRaw);
  } catch {
    return "sale-url";
  }
  if (!ALLOWED_SALE_SCHEMES.has(parsed.protocol)) {
    return "sale-url";
  }

  return {
    listingIntent,
    salePriceMinor,
    saleCurrencyCode: saleCurrencyRaw,
    saleExternalUrl: parsed.toString(),
  };
}
