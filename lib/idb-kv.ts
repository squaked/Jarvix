/**
 * Minimal IndexedDB key-value helpers (Jarvix local persistence).
 * Falls back when IndexedDB is unavailable (SSR, private quirks).
 */

const DB_NAME = "jarvix";
const DB_VERSION = 1;
const STORE = "kv";

let dbOpening: Promise<IDBDatabase | null> | null = null;

function canUseIdb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIdb()) return Promise.resolve(null);
  dbOpening ??= new Promise<IDBDatabase | null>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () =>
      reject(req.error ?? new Error("indexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  }).catch((): IDBDatabase | null => null);
  return dbOpening;
}

export async function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as unknown);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
  });
}

export async function openJarvixIdb(): Promise<IDBDatabase | null> {
  return openDb();
}

export async function readJarvixKey(key: string): Promise<unknown> {
  const db = await openJarvixIdb();
  if (!db) return undefined;
  return idbGet(db, key);
}

export async function writeJarvixKey(key: string, value: unknown): Promise<void> {
  const db = await openJarvixIdb();
  if (!db) throw new Error("IDB unavailable");
  await idbPut(db, key, value);
}

export async function jarvixIdbUsable(): Promise<boolean> {
  const db = await openJarvixIdb();
  return db !== null;
}
