export type ClipEntry = {
  id: string;
  name: string;
  content: string;
  masked: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  localOnly?: boolean;
  sortKey?: number;
  category?: string;
};

export type AppSettings = {
  clipboardAutoClear?: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  clipboardAutoClear: true,
};

export const CLIPBOARD_AUTO_CLEAR_MS = 60_000;

export function isTombstone(e: ClipEntry): boolean {
  return typeof e.deletedAt === 'number' && e.deletedAt > 0;
}

export function isLocalOnly(e: ClipEntry): boolean {
  return e.localOnly === true;
}

export function getSortKey(e: ClipEntry): number {
  return typeof e.sortKey === 'number' ? e.sortKey : e.createdAt;
}
