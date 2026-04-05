"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IdealPostcodesAddressLookup,
  type AddressFormValues,
} from "@/app/onboarding/ideal-postcodes-address-lookup";
import { updateUserAddressAction } from "@/app/(main)/me/actions";

export type MeAddressInitial = {
  line1: string;
  line2: string | null;
  town: string;
  region: string | null;
  postalCode: string;
  countryCode: string;
} | null;

function toFormValues(address: MeAddressInitial): AddressFormValues {
  if (!address) {
    return { line1: "", line2: "", town: "", region: "", postalCode: "", countryCode: "" };
  }
  return {
    line1: address.line1,
    line2: address.line2 ?? "",
    town: address.town,
    region: address.region ?? "",
    postalCode: address.postalCode,
    countryCode: address.countryCode,
  };
}

function formatAddressLines(address: NonNullable<MeAddressInitial>): string[] {
  const line1 = address.line1.trim();
  const line2 = (address.line2 ?? "").trim();
  const town = address.town.trim();
  const region = (address.region ?? "").trim();
  const postal = address.postalCode.trim();
  const cc = address.countryCode.trim().toUpperCase();
  const townRegion = [town, region].filter(Boolean).join(", ");
  const postalLine = [postal, cc].filter(Boolean).join(" ");
  return [line1, line2, townRegion, postalLine].filter((s) => s.length > 0);
}

export function MeAddressSection({ address }: { address: MeAddressInitial }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [lookupKey, setLookupKey] = useState(0);
  const [formValues, setFormValues] = useState<AddressFormValues>(() => toFormValues(address));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFormValues(toFormValues(address));
    }
  }, [address, open]);

  function openModal() {
    setError(null);
    setFormValues(toFormValues(address));
    setLookupKey((k) => k + 1);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateUserAddressAction(fd);
      if (result.ok) {
        closeModal();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const hasAddress = Boolean(address);

  return (
    <div className="min-w-0 text-base-content/80">
      {hasAddress && address ? (
        <div className="space-y-1">
          <div className="text-base-content/90">
            {formatAddressLines(address).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <button type="button" className="link link-primary text-sm" onClick={openModal}>
            Edit address
          </button>
        </div>
      ) : (
        <div>
          <button type="button" className="link link-primary text-sm" onClick={openModal}>
            Add address
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onCancel={(ev) => {
          ev.preventDefault();
          closeModal();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="modal-box flex max-h-[min(85dvh,32rem)] w-full max-w-lg flex-col p-0">
          <div className="flex items-center justify-between border-b border-base-content/10 px-4 py-3">
            <h2 className="text-base font-semibold text-base-content">
              {hasAddress ? "Edit address" : "Add address"}
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle min-h-9 w-9"
              aria-label="Close"
              onClick={closeModal}
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <IdealPostcodesAddressLookup
                key={lookupKey}
                initialValues={formValues}
                value={formValues}
                onAddressChange={setFormValues}
              />
              <input type="hidden" name="line1" value={formValues.line1} />
              <input type="hidden" name="line2" value={formValues.line2} />
              <input type="hidden" name="town" value={formValues.town} />
              <input type="hidden" name="region" value={formValues.region} />
              <input type="hidden" name="postalCode" value={formValues.postalCode} />
              <input type="hidden" name="countryCode" value={formValues.countryCode} />
              {error ? (
                <div className="mt-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-base-content/10 px-4 py-3">
              <button type="button" className="btn btn-ghost flex-1 rounded-xl" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1 rounded-xl" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
