export const NOTIFICATION_READ_STORAGE_KEY = "home-notification-read-ids";
export const NOTIFICATION_DISMISSED_STORAGE_KEY = "home-notification-dismissed-ids";

export function readStoredStringList(key: string) {
  if (typeof window === "undefined") return [] as string[];

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeStoredStringList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}
