import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clientProfile } = await req.json();

    const response = await fetch(
  "https:/ai-backend-pp4s4np4z-jamies-projects-ffb1e526.vercel.app/api/generate-meal-plan",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientProfile }),
  }
);

const text = await response.text();

console.log("RAW SERVER RESPONSE:", text);


    const data = await response.json();
    const content = data.choices[0].message.content;

    return NextResponse.json({ mealPlan: content });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
