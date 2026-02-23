import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clientProfile } = await req.json();

    const response = await fetch(
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
Create a 7-day meal plan in valid JSON only.

Client Data:
${JSON.stringify(clientProfile)}
              `,
            },
          ],
          temperature: 0.7,
        }),
      }
    );

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
