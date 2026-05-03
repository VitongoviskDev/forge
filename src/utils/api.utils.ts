import type { AxiosError } from "axios";
import type { BaseErrorResponse } from "@/types/global.types";
import type { ApiError, HttpStatus } from "@/types/api.types";

export function parseApiError<
  TMap extends Partial<Record<HttpStatus, any>>
>(
  error: unknown
): ApiError<TMap> {
  const axiosError = error as AxiosError<BaseErrorResponse<any>>;

  const rawStatus = axiosError.response?.status;

  const status = (rawStatus ?? 500) as keyof TMap;

  return {
    status,
    message:
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Erro desconhecido",
    error_data:
      axiosError.response?.data?.error_data ??
      ({} as TMap[keyof TMap]),
  } as ApiError<TMap>;
}