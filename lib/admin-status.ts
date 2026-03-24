"use client";

type AdminStatusResponse = {
  isAdmin?: boolean;
};

const adminStatusCache = new Map<string, boolean>();
const adminStatusPromiseCache = new Map<string, Promise<boolean>>();

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export async function getCachedAdminStatus(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  const cachedValue = adminStatusCache.get(normalizedEmail);

  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const pendingValue = adminStatusPromiseCache.get(normalizedEmail);

  if (pendingValue) {
    return pendingValue;
  }

  const nextPromise = fetch("/api/admin/status", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        return false;
      }

      const result = (await response.json()) as AdminStatusResponse;
      return Boolean(result.isAdmin);
    })
    .catch(() => false)
    .then((value) => {
      adminStatusCache.set(normalizedEmail, value);
      adminStatusPromiseCache.delete(normalizedEmail);
      return value;
    });

  adminStatusPromiseCache.set(normalizedEmail, nextPromise);

  return nextPromise;
}
