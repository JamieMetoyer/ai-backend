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
       1️⃣ OPEN FOOD FACTS
    ======================================================= */

    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      const offData = await offRes.json();

      if (offData.status === 1) {
        const product = offData.product;
        const nutriments = product.nutriments || {};

        // Calories handling (kcal or kJ)
        let calories = 0;

        if (nutriments["energy-kcal_100g"]) {
          calories = Number(nutriments["energy-kcal_100g"]);
        } else if (nutriments["energy_100g"]) {
          // Convert kJ → kcal
          calories = Number(nutriments["energy_100g"]) / 4.184;
        }

        return NextResponse.json({
          source: "openfoodfacts",
          name: product.product_name || "Unknown Food",
          brand: product.brands || "",
          per100g: {
            calories: Math.round(calories || 0),
            protein: Number(nutriments.proteins_100g || 0),
            carbs: Number(nutriments.carbohydrates_100g || 0),
            fat: Number(nutriments.fat_100g || 0),
            fiber: Number(nutriments.fiber_100g || 0),
            sugar: Number(nutriments.sugars_100g || 0),
            sodium: Number(nutriments.sodium_100g || 0),
          },
        });
      }
    } catch (err) {
      console.log("OpenFoodFacts failed, trying USDA...");
    }

    /* =======================================================
       2️⃣ USDA FALLBACK
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

    // Flexible nutrient matcher
    const getNutrient = (keyword: string) => {
      const match = nutrients.find((n: any) =>
        n.nutrientName?.toLowerCase().includes(keyword.toLowerCase())
      );
      return match?.value || 0;
    };

    return NextResponse.json({
      source: "usda",
      name: food.description || "Unknown Food",
      brand: food.brandOwner || "",
      per100g: {
        calories: getNutrient("energy"),
        protein: getNutrient("protein"),
        carbs: getNutrient("carbohydrate"),
        fat: getNutrient("lipid"),
        fiber: getNutrient("fiber"),
        sugar: getNutrient("sugar"),
        sodium: getNutrient("sodium"),
      },
    });

  } catch (error) {
    console.error("Barcode lookup error:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
