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

    /* ================= OPEN FOOD FACTS ================= */

    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      const offData = await offRes.json();

      if (offData.status === 1) {
        const product = offData.product;
        const n = product.nutriments || {};

        let calories = 0;

        if (n["energy-kcal_100g"]) {
          calories = Number(n["energy-kcal_100g"]);
        } else if (n["energy_100g"]) {
          calories = Number(n["energy_100g"]) / 4.184;
        }

        return NextResponse.json({
          source: "openfoodfacts",
          name: product.product_name || "Unknown Food",
          brand: product.brands || "",
          per100g: {
            calories: Math.round(calories || 0),
            protein: Number(n.proteins_100g || 0),
            carbs: Number(n.carbohydrates_100g || 0),
            fat: Number(n.fat_100g || 0),

            saturatedFat: Number(n["saturated-fat_100g"] || 0),
            transFat: Number(n["trans-fat_100g"] || 0),
            cholesterol: Number(n["cholesterol_100g"] || 0),

            fiber: Number(n.fiber_100g || 0),
            sugar: Number(n.sugars_100g || 0),
            addedSugar: Number(n["added-sugars_100g"] || 0),

            vitaminD: Number(n["vitamin-d_100g"] || 0),
            calcium: Number(n["calcium_100g"] || 0),
            iron: Number(n["iron_100g"] || 0),
            potassium: Number(n["potassium_100g"] || 0),
            sodium: Number(n.sodium_100g || 0),
          },
        });
      }
    } catch (err) {
      console.log("OFF failed, trying USDA...");
    }

    /* ================= USDA ================= */

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

        saturatedFat: getNutrient("saturated"),
        transFat: getNutrient("trans"),
        cholesterol: getNutrient("cholesterol"),

        fiber: getNutrient("fiber"),
        sugar: getNutrient("sugar"),
        addedSugar: getNutrient("added"),

        vitaminD: getNutrient("vitamin d"),
        calcium: getNutrient("calcium"),
        iron: getNutrient("iron"),
        potassium: getNutrient("potassium"),
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
