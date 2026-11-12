export type TApiResponse<T = unknown> = {
  message: string;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
  pageCount?: number;
};
