import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, requestClientKey } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(`zenith:${user.id}:${requestClientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini API key not configured on the server." }, { status: 500 });
  let body: { systemPrompt?: unknown; userMessage?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (typeof body.userMessage !== "string" || !body.userMessage.trim() || body.userMessage.length > 20_000) {
    return NextResponse.json({ error: "Missing or invalid userMessage" }, { status: 400 });
  }
  if (body.systemPrompt != null && (typeof body.systemPrompt !== "string" || body.systemPrompt.length > 20_000)) {
    return NextResponse.json({ error: "Invalid systemPrompt" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"]) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: body.systemPrompt ?? "" });
      const result = await model.generateContent(body.userMessage);
      return NextResponse.json({ text: result.response.text() });
    } catch { continue; }
  }
  return NextResponse.json({ error: "All Gemini models failed." }, { status: 502 });
}
