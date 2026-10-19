import pandas as pd

MIN_CAL = 20
MAX_CAL = 2000

df = pd.read_csv("data/recipes.csv", nrows=5000)
total = len(df)

too_low = df["Calories"] < MIN_CAL
too_high = df["Calories"] > MAX_CAL
batch_like = (df["RecipeServings"] <= 1) & (df["Calories"] > 1000)
no_ingredients = df["RecipeIngredientParts"].isna() | (
    df["RecipeIngredientParts"] == "character(0)"
)
duplicate_name = df["Name"].duplicated()

rules = {
    "Calories too low": too_low,
    "Calories too high": too_high,
    "Batch-like (1 serving, >1000 cal)": batch_like,
    "No ingredients": no_ingredients,
    "Duplicate name": duplicate_name,
}

for rule_name, mask in rules.items():
    count = mask.sum()
    print(f"{rule_name}: {count} rows ({count / total * 100:.1f}%)")

without_servings_rule = too_low | too_high | no_ingredients | duplicate_name
with_servings_rule = without_servings_rule | batch_like

print("Removed, calorie cap only:", without_servings_rule.sum())
print("Removed, plus servings rule:", with_servings_rule.sum())
print("Rows kept (plus servings rule):", total - with_servings_rule.sum())