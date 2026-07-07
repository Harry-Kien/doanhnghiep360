// Helpers tạo response JSON theo envelope chuẩn.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HTTP_STATUS_FOR_CODE, type ApiError, type ApiErrorCode } from "@/shared/api";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true as const, data }, { status });
}

export function fail(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
  const error: ApiError = { code, message, fields };
  return NextResponse.json({ ok: false as const, error }, { status: HTTP_STATUS_FOR_CODE[code] });
}

export function failFromZod(err: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fail("VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields);
}
