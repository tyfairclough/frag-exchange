"use client";

import { ListingIntent } from "@/generated/prisma/enums";

type Props = {
  value: ListingIntent;
  onChange: (value: ListingIntent) => void;
  salePrice: string;
  onSalePriceChange: (value: string) => void;
  saleCurrency: string;
  onSaleCurrencyChange: (value: string) => void;
  saleExternalUrl: string;
  onSaleExternalUrlChange: (value: string) => void;
  allowForSale: boolean;
};

export function ListingIntentFields({
  value,
  onChange,
  salePrice,
  onSalePriceChange,
  saleCurrency,
  onSaleCurrencyChange,
  saleExternalUrl,
  onSaleExternalUrlChange,
  allowForSale,
}: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-base-content">Listing type</legend>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="listingIntent"
          value={ListingIntent.SWAP}
          checked={value === ListingIntent.SWAP}
          onChange={() => onChange(ListingIntent.SWAP)}
        />
        Swap
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="listingIntent"
          value={ListingIntent.FREE}
          checked={value === ListingIntent.FREE}
          onChange={() => onChange(ListingIntent.FREE)}
        />
        Free to a good home
      </label>
      {allowForSale ? (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="listingIntent"
            value={ListingIntent.FOR_SALE}
            checked={value === ListingIntent.FOR_SALE}
            onChange={() => onChange(ListingIntent.FOR_SALE)}
          />
          For sale
        </label>
      ) : null}
      {value === ListingIntent.FOR_SALE ? (
        <div className="grid gap-3 rounded-xl border border-base-content/10 bg-base-200/30 p-3 sm:grid-cols-2">
          <label className="form-control w-full">
            <span className="label-text font-medium">Price</span>
            <input
              name="salePrice"
              type="number"
              min="0.01"
              step="0.01"
              value={salePrice}
              onChange={(e) => onSalePriceChange(e.target.value)}
              required
              className="input input-bordered w-full rounded-xl"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text font-medium">Currency</span>
            <select
              name="saleCurrency"
              className="select select-bordered w-full rounded-xl"
              value={saleCurrency}
              onChange={(e) => onSaleCurrencyChange(e.target.value)}
            >
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
              <option value="NZD">NZD</option>
              <option value="JPY">JPY</option>
            </select>
          </label>
          <label className="form-control w-full sm:col-span-2">
            <span className="label-text font-medium">Listing URL</span>
            <input
              name="saleExternalUrl"
              type="url"
              value={saleExternalUrl}
              onChange={(e) => onSaleExternalUrlChange(e.target.value)}
              required
              className="input input-bordered w-full rounded-xl"
              placeholder="https://..."
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
