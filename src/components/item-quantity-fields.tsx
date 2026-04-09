"use client";

type ItemQuantityFieldsProps = {
  hasMultiple: boolean;
  setHasMultiple: (v: boolean) => void;
  quantity: string;
  setQuantity: (v: string) => void;
};

export function ItemQuantityFields({
  hasMultiple,
  setHasMultiple,
  quantity,
  setQuantity,
}: ItemQuantityFieldsProps) {
  const count = Number.parseInt(quantity, 10);
  const displayCount = Number.isFinite(count) && count >= 2 ? count : 2;

  return (
    <>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={hasMultiple}
          onChange={(e) => setHasMultiple(e.target.checked)}
          className="checkbox"
        />
        <span className="text-sm">I have more than 1 to exchange</span>
      </label>

      {hasMultiple ? (
        <>
          <label className="form-control w-full">
            <span className="label-text font-medium">Number of items</span>
            <input
              type="number"
              min={2}
              step={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input input-bordered w-full rounded-xl"
            />
          </label>
          <div className="alert alert-info text-sm shadow-sm">
            <span>
              Using this option will allow you exchange this item {displayCount} times, it does not trade all{" "}
              {displayCount} in one exchange.
            </span>
          </div>
        </>
      ) : null}
    </>
  );
}
