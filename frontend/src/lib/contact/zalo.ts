const ALLOWED_ZALO_HOSTS = new Set(["zalo.me", "www.zalo.me", "chat.zalo.me"]);

function normalizePhoneIdentifier(value: string): string | null {
  const normalized = value.replace(/[\s().-]/g, "");
  if (/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    return normalized.replace(/^\+/, "");
  }
  if (/^0\d{8,10}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function getSafeZaloUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const phone = normalizePhoneIdentifier(trimmed);
  if (phone) {
    return `https://zalo.me/${encodeURIComponent(phone)}`;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !ALLOWED_ZALO_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
