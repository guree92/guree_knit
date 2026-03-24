export const NOTIFICATION_READ_STORAGE_KEY = "home-notification-read-ids";
export const NOTIFICATION_DISMISSED_STORAGE_KEY = "home-notification-dismissed-ids";
const HOME_NOTIFICATION_STORAGE_EVENT = "home-notification-storage";

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
  window.dispatchEvent(new CustomEvent(HOME_NOTIFICATION_STORAGE_EVENT, { detail: key }));
}

export function subscribeStoredStringList(key: string, onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === key) {
      onChange();
    }
  };

  const handleCustomStorage = (event: Event) => {
    const customEvent = event as CustomEvent<string>;

    if (!customEvent.detail || customEvent.detail === key) {
      onChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(HOME_NOTIFICATION_STORAGE_EVENT, handleCustomStorage as EventListener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(HOME_NOTIFICATION_STORAGE_EVENT, handleCustomStorage as EventListener);
  };
}
