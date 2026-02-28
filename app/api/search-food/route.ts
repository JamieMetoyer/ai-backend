import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";


const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // 1️⃣ Check cache first
  const { data: cached } = await supabase
    .from("foods")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(20);

  if (cached && cached.length > 0) {
    return NextResponse.json(cached);
  }

  // 2️⃣ Call USDA
  const usdaRes = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_KEY}&query=${query}&pageSize=20`
  );

  const usdaData = await usdaRes.json();

  const formatted = usdaData.foods.map((food: any) => {
    const get = (name: string) =>
      food.foodNutrients.find((n: any) => n.nutrientName === name)?.value || 0;

    return {
      fdc_id: food.fdcId,
      name: food.description,
      brand: food.brandOwner || "",
      calories: get("Energy"),
      protein: get("Protein"),
      carbs: get("Carbohydrate, by difference"),
      fat: get("Total lipid (fat)"),
      source: "usda"
    };
  });

  // 3️⃣ Upsert into DB
  await supabase.from("foods").upsert(formatted, {
    onConflict: "fdc_id"
  });

  return NextResponse.json(formatted);
}
