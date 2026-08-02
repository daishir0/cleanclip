export interface CategoryGroup<T> {
  name: string;
  entries: T[];
}

export interface GroupedEntries<T> {
  uncategorized: T[];
  categories: CategoryGroup<T>[];
}

export function normalizeCategory(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function groupByCategory<T extends { category?: string }>(entries: T[]): GroupedEntries<T> {
  const uncategorized: T[] = [];
  const byName = new Map<string, T[]>();
  for (const e of entries) {
    const cat = normalizeCategory(e.category);
    if (!cat) {
      uncategorized.push(e);
      continue;
    }
    const list = byName.get(cat);
    if (list) list.push(e);
    else byName.set(cat, [e]);
  }
  const categories = Array.from(byName.entries())
    .map(([name, list]) => ({ name, entries: list }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { uncategorized, categories };
}

export function listCategories<T extends { category?: string }>(entries: T[]): string[] {
  return groupByCategory(entries).categories.map(c => c.name);
}
