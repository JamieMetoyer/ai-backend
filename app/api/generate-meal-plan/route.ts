import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clientProfile } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `
Return ONLY valid JSON.

Create a 7-day meal plan.

Client Data:
${JSON.stringify(clientProfile)}
              `,
            },
          ],
          temperature: 0.7,
        }),
      }
    );

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return NextResponse.json(
        { error: "OpenAI failed", details: data },
        { status: 500 }
      );
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No content from OpenAI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mealPlan: content,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
