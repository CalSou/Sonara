import { NextResponse } from "next/server";
import { z } from "zod";

import { signIn } from "@/auth";
import { requireDb } from "@/db/index";
import { jsonError } from "@/lib/api/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, {
        error: parsed.error.message,
        code: "VALIDATION_ERROR",
      });
    }

    requireDb();

    // redirect:false — success is undefined; failure returns a URL with ?error=
    const redirectUrl = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (redirectUrl === undefined || redirectUrl === null) {
      return NextResponse.json({ ok: true });
    }

    try {
      const url = new URL(String(redirectUrl), "http://localhost");
      const err = url.searchParams.get("error");
      if (err) {
        return jsonError(401, {
          error: "Invalid credentials",
          code: "UNAUTHORIZED",
        });
      }
    } catch {
      /* fallthrough */
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }
}
