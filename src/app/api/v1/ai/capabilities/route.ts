import { NextResponse } from "next/server";

import { resolveEffectiveAiGenerationBackend } from "@/lib/ai/server/factory";

/** Public capability probe for Studio (no secrets exposed). */
export async function GET() {
  return NextResponse.json({
    generateBackend: resolveEffectiveAiGenerationBackend(),
  });
}
