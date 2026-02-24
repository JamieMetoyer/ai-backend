import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ test: "API IS WORKING" });
}
