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
};

export type AppSettings = Record<string, never>;

export const DEFAULT_SETTINGS: AppSettings = {};

export function isTombstone(e: ClipEntry): boolean {
  return typeof e.deletedAt === 'number' && e.deletedAt > 0;
}

export function isLocalOnly(e: ClipEntry): boolean {
  return e.localOnly === true;
}

export function getSortKey(e: ClipEntry): number {
  return typeof e.sortKey === 'number' ? e.sortKey : e.createdAt;
}
