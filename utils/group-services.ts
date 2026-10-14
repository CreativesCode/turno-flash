/**
 * Groups services by category for every view that lists them (PRP-004):
 * Services page, staff "Servicios y horario", appointment form and /book.
 *
 * - Input order is kept inside each group: callers pass services already
 *   sorted (sort_order, name).
 * - Categories follow the order given (sort_order, name).
 * - Services whose category is missing from `categories` (deleted, inactive
 *   or not sent) fall into the "no category" group, which goes last.
 * - Empty categories are dropped.
 * - With no category in use, the result is one group with category null:
 *   the view renders the flat list exactly as before.
 */

export interface CategoryLike {
  id: string;
  name: string;
  description?: string | null;
}

export interface ServiceGroup<S, C extends CategoryLike = CategoryLike> {
  /** null = services without a category ("Otros") */
  category: C | null;
  services: S[];
}

export const UNCATEGORIZED_LABEL = "Otros";

export function groupServices<
  S extends { category_id: string | null },
  C extends CategoryLike,
>(services: S[], categories: C[]): ServiceGroup<S, C>[] {
  const byCategory = new Map<string, S[]>();
  const uncategorized: S[] = [];
  const known = new Set(categories.map((c) => c.id));

  for (const service of services) {
    const id = service.category_id;
    if (id && known.has(id)) {
      const list = byCategory.get(id);
      if (list) list.push(service);
      else byCategory.set(id, [service]);
    } else {
      uncategorized.push(service);
    }
  }

  const groups: ServiceGroup<S, C>[] = categories
    .filter((c) => byCategory.has(c.id))
    .map((c) => ({ category: c, services: byCategory.get(c.id) ?? [] }));

  if (uncategorized.length > 0) {
    groups.push({ category: null, services: uncategorized });
  }
  return groups;
}

/** True when the grouped view has real headings to show. */
export function hasCategoryGroups<S, C extends CategoryLike>(
  groups: ServiceGroup<S, C>[]
): boolean {
  return groups.some((g) => g.category !== null);
}
