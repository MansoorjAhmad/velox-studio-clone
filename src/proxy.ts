import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 proxy (renamed from "middleware").
 * Refreshes auth sessions + enforces route guards on every request.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|demo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
