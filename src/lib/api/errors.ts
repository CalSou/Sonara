import { NextResponse } from "next/server";

export type ApiErrorBody = { error: string; code: string };

export function jsonError(
  status: number,
  body: ApiErrorBody,
  headers?: HeadersInit,
) {
  return NextResponse.json(body, { status, headers });
}
