// API envelope dùng chung cho mọi route handler.

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STATE_TRANSITION_INVALID"
  | "PROVIDER_ERROR"
  | "EVIDENCE_REQUIRED"
  | "LAWYER_APPROVAL_REQUIRED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string>;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const HTTP_STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  STATE_TRANSITION_INVALID: 422,
  PROVIDER_ERROR: 502,
  EVIDENCE_REQUIRED: 422,
  LAWYER_APPROVAL_REQUIRED: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};
