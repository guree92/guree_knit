export const NOTIFICATION_READ_STORAGE_KEY = "home-notification-read-ids";
export const NOTIFICATION_DISMISSED_STORAGE_KEY = "home-notification-dismissed-ids";
const HOME_NOTIFICATION_STORAGE_EVENT = "home-notification-storage";
const EMPTY_STRING_LIST: string[] = [];
const storedStringListCache = new Map<string, { raw: string | null; values: string[] }>();

export function readStoredStringList(key: string) {
  if (typeof window === "undefined") return EMPTY_STRING_LIST;

  try {
    const raw = window.localStorage.getItem(key);
    const cached = storedStringListCache.get(key);

    if (cached && cached.raw === raw) {
      return cached.values;
    }

    const parsed = raw ? (JSON.parse(raw) as unknown) : EMPTY_STRING_LIST;
    const values = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY_STRING_LIST;

    storedStringListCache.set(key, { raw, values });
    return values;
  } catch {
    storedStringListCache.set(key, { raw: null, values: EMPTY_STRING_LIST });
    return EMPTY_STRING_LIST;
  }
}

export function writeStoredStringList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(values);
  window.localStorage.setItem(key, serialized);
  storedStringListCache.set(key, { raw: serialized, values });
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
