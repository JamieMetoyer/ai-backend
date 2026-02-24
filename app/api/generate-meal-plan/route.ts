import { NextResponse } from "next/server";

function calculateCalories(client: any) {
  const { weight, height, age, gender, activity, goal } = client;

  // Mifflin-St Jeor
  let bmr;

  if (gender === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  const activityMultipliers: any = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = bmr * (activityMultipliers[activity] || 1.55);

  // Goal adjustment
  let calories = tdee;

  if (goal === "fat_loss") calories -= 400;
  if (goal === "muscle_gain") calories += 300;

  return Math.round(calories);
}

function calculateMacros(calories: number, weight: number) {
  // Protein: 0.8–1g per lb (we’ll use 1g per lb)
  const protein = Math.round(weight * 1);

  // Fat: 25% of calories
  const fat = Math.round((calories * 0.25) / 9);

  // Carbs: remaining calories
  const remainingCalories =
    calories - (protein * 4 + fat * 9);

  const carbs = Math.round(remainingCalories / 4);

  return { protein, carbs, fat };
}

export async function POST(req: Request) {
  try {
    const { clientProfile } = await req.json();

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Missing clientProfile" },
        { status: 400 }
      );
    }

    // 🔥 SERVER CALCULATIONS
    const calories = calculateCalories(clientProfile);
    const { protein, carbs, fat } = calculateMacros(
      calories,
      clientProfile.weight
    );

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    // AI ONLY BUILDS MEAL PLAN
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
              role: "system",
              content: `
You are a professional nutritionist.
Create a 7-day meal plan that EXACTLY matches these macros.
Return ONLY valid JSON.
              `,
            },
            {
              role: "user",
              content: `
Calories: ${calories}
Protein: ${protein}
Carbs: ${carbs}
Fat: ${fat}

Client Info:
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

    return NextResponse.json({
      calories,
      protein,
      carbs,
      fat,
      mealPlan: JSON.parse(content),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
