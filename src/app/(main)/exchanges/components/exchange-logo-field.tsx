"use client";

import { SquareImageUploadField } from "@/components/square-image-upload-field";

type ExchangeLogoFieldProps = {
  initialImageUrl?: string | null;
  label?: string;
  helpText?: string;
};

export function ExchangeLogoField({
  initialImageUrl = null,
  label = "Exchange logo (optional)",
  helpText = "Crop to square before saving. JPG, PNG, or WebP up to 6MB.",
}: ExchangeLogoFieldProps) {
  return (
    <SquareImageUploadField
      inputName="logoFile"
      initialImageUrl={initialImageUrl}
      label={label}
      helpText={helpText}
      outputFileName="exchange-logo.webp"
    />
  );
}
