import { isNotEmpty } from 'class-validator';
import { HydratedDocument, Model, Query, QueryFilter } from 'mongoose';
import { PAGINATION, SORT_ORDER } from '../constants/enums.constants.js';
import {
  comparisonOperators,
  escapeRegex,
  NON_FILTER_FIELDS,
  TComparisonOperators,
} from './utilVars.js';

export type TApiFeaturesOptions = {
  // Fields matched (case-insensitive, substring) by `searchTerm`.
  searchFields?: string[];
  // Fields whose values are cast to Date, incl. range filters like `startTime.gte`.
  dateFields?: string[];
  // Sort used when the request doesn't send `sort`.
  defaultSort?: string;
};

type TQueryObj = Record<string, unknown>;

/**
 * Builds a Mongoose find() query from validated query params:
 *
 *   status=completed           -> { status: 'completed' }
 *   status=low,high            -> { status: { $in: ['low', 'high'] } }
 *   title=fin*                 -> { title: { $regex: '^fin.*', $options: 'i' } }
 *   startTime.gte=<ISO date>   -> { startTime: { $gte: Date } }   (also gt, lte, lt)
 *   searchTerm=wire            -> { $or: [{ title: /wire/i }, { description: /wire/i }] }
 *   sort=startTime&sortOrder=desc, fields=title,status, page=2&limit=20
 *
 * Use getFilter() for countDocuments() so the total always matches the data.
 */
export class APIFeatures<T> {
  private _query: Query<HydratedDocument<T>[], HydratedDocument<T>>;
  private _filter: QueryFilter<T> = {};
  private readonly _queryObj: TQueryObj;

  constructor(
    private readonly _model: Model<T>,
    queryObj: object,
    private readonly _options: TApiFeaturesOptions = {},
  ) {
    this._queryObj = { ...queryObj } as TQueryObj;
    this._query = this._model.find();
  }

  filter(): this {
    const filters: TQueryObj = {};
    const dateFields = this._options.dateFields ?? [];

    Object.entries(this._queryObj).forEach(([field, value]) => {
      if (NON_FILTER_FIELDS.includes(field) || !isNotEmpty(value)) return;

      const [fieldName, operator] = field.split('.');
      const toValue = (v: unknown) =>
        dateFields.includes(fieldName) ? new Date(v as string) : v;

      if (
        operator &&
        comparisonOperators.includes(operator as TComparisonOperators)
      ) {
        // Range filter, e.g. startTime.gte / startTime.lt. Values are exact
        // instants: the client sends timezone-aware boundaries (like a week's
        // Monday 00:00 in the user's zone), so no rounding happens here.
        filters[fieldName] = {
          ...(filters[fieldName] as object),
          [`$${operator}`]: toValue(value),
        };
      } else if (Array.isArray(value)) {
        // Already split by the DTO (e.g. status=a,b -> ['a', 'b']).
        filters[field] =
          value.length === 1 ? toValue(value[0]) : { $in: value.map(toValue) };
      } else if (typeof value === 'string' && value.includes('*')) {
        // Wildcard prefix match; everything except `*` is matched literally.
        const pattern = value.split('*').map(escapeRegex).join('.*');
        filters[field] = { $regex: `^${pattern}`, $options: 'i' };
      } else if (typeof value === 'string' && value.includes(',')) {
        filters[field] = {
          $in: value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .map(toValue),
        };
      } else {
        filters[field] = toValue(value);
      }
    });

    this._applyFilter(filters as QueryFilter<T>);
    return this;
  }

  search(): this {
    const searchTerm = this._queryObj.searchTerm;
    const searchFields = this._options.searchFields ?? [];

    if (typeof searchTerm === 'string' && searchTerm && searchFields.length) {
      const pattern = { $regex: escapeRegex(searchTerm), $options: 'i' };
      this._applyFilter({
        $or: searchFields.map((field) => ({ [field]: pattern })),
      } as QueryFilter<T>);
    }
    return this;
  }

  sort(): this {
    const sortBy =
      typeof this._queryObj.sort === 'string' && this._queryObj.sort
        ? this._queryObj.sort
        : (this._options.defaultSort ?? 'updatedAt');
    const direction = this._queryObj.sortOrder === SORT_ORDER.DESC ? -1 : 1;

    const sort: Record<string, 1 | -1> = {};
    sortBy.split(',').forEach((field) => (sort[field.trim()] = direction));
    // Tie-breaker so paging is stable when sort values are equal.
    sort._id ??= direction;

    this._query = this._query.sort(sort);
    return this;
  }

  limitFields(): this {
    const { fields } = this._queryObj;
    const list =
      typeof fields === 'string' ? fields.split(',') : (fields as string[]);
    if (Array.isArray(list) && list.length) {
      this._query = this._query.select(list.map((f) => f.trim()).join(' '));
    }
    return this;
  }

  paginate(): this {
    const page = Number(this._queryObj.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Number(this._queryObj.limit) || PAGINATION.DEFAULT_LIMIT;
    this._query = this._query.skip((page - 1) * limit).limit(limit);
    return this;
  }

  getQuery() {
    return this._query;
  }

  // The combined filter from filter() and search(), for countDocuments().
  getFilter(): QueryFilter<T> {
    return this._filter;
  }

  private _applyFilter(filter: QueryFilter<T>): void {
    if (!Object.keys(filter).length) return;
    this._filter = { ...this._filter, ...filter };
    this._query = this._query.find(filter);
  }
}
