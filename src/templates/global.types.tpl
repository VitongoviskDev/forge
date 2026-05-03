export type BasePayload<T extends {
  queryParams?: object;
  routeParams?: object;
  body?: object;
}> = T;

export type BaseSuccessResponse<TData> = {
  message: string;
  data: TData;
  status: number;
};

export type BaseErrorResponse<TErrorData> = {
  status: number;
  error_data: TErrorData;
  message: string;
};