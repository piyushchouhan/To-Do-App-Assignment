export enum TComparisonOperators {
  GTE = 'gte',
  GT = 'gt',
  LTE = 'lte',
  LT = 'lt',
}

export const comparisonOperators = Object.values(TComparisonOperators);

// Query params that control the query itself and are never used as filters.
export const NON_FILTER_FIELDS = [
  'page',
  'limit',
  'sort',
  'sortOrder',
  'fields',
  'searchTerm',
];

export const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
