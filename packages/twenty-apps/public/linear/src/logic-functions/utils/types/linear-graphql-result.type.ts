export type LinearGraphQLResult<TData> = {
  data?: TData;
  httpStatus?: number;
  errors?: Array<{
    message: string;
    extensions?: { code?: string; type?: string };
  }>;
};
