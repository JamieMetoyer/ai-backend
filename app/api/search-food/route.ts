import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_KEY}&query=${query}&pageSize=20`
    );

    const data = await res.json();

    const formatted = data.foods?.map((food: any) => {
      const get = (name: string) =>
        food.foodNutrients?.find((n: any) => n.nutrientName === name)?.value || 0;

      return {
        fdc_id: food.fdcId,
        name: food.description,
        brand: food.brandOwner || "",
        calories: get("Energy"),
        protein: get("Protein"),
        carbs: get("Carbohydrate, by difference"),
        fat: get("Total lipid (fat)")
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch foods" }, { status: 500 });
  }
}
