import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Excludes all of /_next/* (not just static/image) — Turbopack's dev-mode
  // HMR websocket lives under /_next too and isn't app data, so gating it
  // just breaks live reload without any security benefit.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length, 32);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) diff |= aPadded[i] ^ bPadded[i];
  return diff === 0;
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Family Dinner Planner"' },
  });
}

export function middleware(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  // Fail closed: block everything if creds aren't configured, rather than
  // silently exposing the app to the internet.
  if (!expectedUser || !expectedPassword) {
    return new NextResponse(
      "Server misconfiguration: BASIC_AUTH_USER/BASIC_AUTH_PASSWORD not set",
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  let decoded: string;
  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return unauthorizedResponse();
  }

  const sepIndex = decoded.indexOf(":");
  if (sepIndex === -1) return unauthorizedResponse();

  const user = decoded.slice(0, sepIndex);
  const password = decoded.slice(sepIndex + 1);

  if (
    !timingSafeEqual(user, expectedUser) ||
    !timingSafeEqual(password, expectedPassword)
  ) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}
