/** Persistencia híbrida blindada: IndexedDB persistente + LocalStorage espejo + Exportar/Importar JSON */
import type { SaveData } from '../../core/types';

const LS_KEY = 'juego-mate-save-v1';
const DB_NAME = 'mazmorra-matematica-db';
const DB_STORE = 'saves';
const DB_KEY = 'primary';

export interface SaveRepository {
  load(): SaveData | null;
  save(d: SaveData): void;
  clear(): void;
  hydrateFromIDB?(cb: (d: SaveData | null) => void): void;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-idb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbWrite(data: SaveData): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(data, DB_KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* fallback silencioso a localStorage */ }
}

async function idbRead(): Promise<SaveData | null> {
  try {
    const db = await openDB();
    return await new Promise<SaveData | null>((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => res(req.result?.version === 1 ? (req.result as SaveData) : null);
      req.onerror = () => rej(req.error);
    });
  } catch { return null; }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(DB_KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* nada */ }
}

/** Solicita al navegador almacenamiento persistente para evitar borrado automático en móviles (iOS/Android). */
export function requestDurableStorage(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      void navigator.storage.persist();
    }
  } catch { /* sin soporte */ }
}

export class HybridRepo implements SaveRepository {
  private mem: string | null = null;

  constructor() {
    requestDurableStorage();
  }

  load(): SaveData | null {
    try {
      const s = (typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null) ?? this.mem;
      if (!s) return null;
      const d = JSON.parse(s);
      return d?.version === 1 ? d : null;
    } catch { return null; }
  }

  save(d: SaveData): void {
    const s = JSON.stringify(d);
    this.mem = s;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, s);
    } catch { /* cuota excedida */ }
    void idbWrite(d);
  }

  clear(): void {
    this.mem = null;
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY);
    } catch { /* nada */ }
    void idbClear();
  }

  /** Recupera la partida desde IndexedDB si localStorage fue limpiado por el navegador. */
  hydrateFromIDB(cb: (d: SaveData | null) => void): void {
    void idbRead().then(d => {
      if (d) {
        try {
          if (typeof localStorage !== 'undefined' && !localStorage.getItem(LS_KEY)) {
            localStorage.setItem(LS_KEY, JSON.stringify(d));
          }
        } catch { /* nada */ }
      }
      cb(d);
    });
  }
}

export function exportSaveJSON(save: SaveData): void {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (save.profile.name || 'heroe').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  a.href = url;
  a.download = `mazmorra-matematica-${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validateSaveData(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as any;
  if (d.version !== 1 || !d.profile?.heroId || !d.progress || !d.stats || !Array.isArray(d.deck)) return null;
  return d as SaveData;
}

export function importSaveJSON(file: File): Promise<SaveData | null> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        resolve(validateSaveData(parsed));
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
