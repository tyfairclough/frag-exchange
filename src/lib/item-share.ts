export function buildSharedItemPath(exchangeId: string, itemId: string): string {
  return `/shared/exchanges/${encodeURIComponent(exchangeId)}/items/${encodeURIComponent(itemId)}`;
}

export function buildShareMessage(itemName: string, exchangeName: string): string {
  return `${itemName} listed in ${exchangeName}.`;
}

export function buildShareLinks(params: {
  message: string;
  absoluteUrl: string;
}): { whatsapp: string; facebook: string; band: string } {
  const text = `${params.message} ${params.absoluteUrl}`.trim();
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(params.absoluteUrl);
  return {
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(params.message)}`,
    band: `https://band.us/plugin/share?body=${encodedText}&route=${encodedUrl}`,
  };
}
