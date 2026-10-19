import pandas as pd

df = pd.read_csv("data/recipes.csv", nrows=5000)

needle = '\\"'

in_instructions = df["RecipeInstructions"].str.contains(needle, regex=False, na=False)
in_ingredients = df["RecipeIngredientParts"].str.contains(needle, regex=False, na=False)

print("Instructions with escaped quotes:", in_instructions.sum())
print("Ingredients with escaped quotes:", in_ingredients.sum())

if in_instructions.sum() > 0:
    example = df.loc[in_instructions, "RecipeInstructions"].iloc[0]
    pos = example.find(needle)
    print("Example around the first match:")
    print(example[max(0, pos - 60): pos + 60])