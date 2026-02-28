import { NextResponse } from "next/server";

const USDA_KEY = process.env.USDA_KEY;

export async function POST(req: Request) {
  try {
    const { barcode } = await req.json();

    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode required" },
        { status: 400 }
      );
    }

    /* =======================================================
       1️⃣ TRY OPEN FOOD FACTS FIRST
    ======================================================= */

    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      const offData = await offRes.json();

      if (offData.status === 1) {
        const product = offData.product;
        const nutriments = product.nutriments || {};

        return NextResponse.json({
          source: "openfoodfacts",
          name: product.product_name || "Unknown Food",
          brand: product.brands || "",
          calories: Math.round(nutriments["energy-kcal_100g"] || 0),
          protein: Number(nutriments.proteins_100g || 0),
          carbs: Number(nutriments.carbohydrates_100g || 0),
          fat: Number(nutriments.fat_100g || 0),
        });
      }
    } catch (err) {
      console.log("OpenFoodFacts failed, falling back to USDA");
    }

    /* =======================================================
       2️⃣ FALLBACK TO USDA
    ======================================================= */

    if (!USDA_KEY) {
      return NextResponse.json(
        { error: "USDA API key missing" },
        { status: 500 }
      );
    }

    const usdaRes = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: barcode,
          pageSize: 1,
        }),
      }
    );

    const usdaData = await usdaRes.json();

    if (!usdaData.foods || usdaData.foods.length === 0) {
      return NextResponse.json(
        { error: "Food not found" },
        { status: 404 }
      );
    }

    const food = usdaData.foods[0];

    const nutrients = food.foodNutrients || [];

    const getNutrient = (name: string) =>
      nutrients.find((n: any) => n.nutrientName === name)?.value || 0;

    return NextResponse.json({
      source: "usda",
      name: food.description || "Unknown Food",
      brand: food.brandOwner || "",
      calories: Math.round(getNutrient("Energy")),
      protein: Number(getNutrient("Protein")),
      carbs: Number(getNutrient("Carbohydrate, by difference")),
      fat: Number(getNutrient("Total lipid (fat)")),
    });
  } catch (error) {
    console.error("Hybrid barcode lookup error:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
