import pandas as pd

df = pd.read_csv("data/recipes.csv", nrows=5000)

print("Shape:", df.shape)
print("Columns:", list(df.columns))

print(df["Calories"].describe())
print("Missing calories:", df["Calories"].isna().sum())

print("Name:", df["Name"].iloc[0])
print("Ingredients:", df["RecipeIngredientParts"].iloc[0])
print("Type:", type(df["RecipeIngredientParts"].iloc[0]))


low = len(df[df["Calories"] < 20])
high = len(df[df["Calories"] > 3000])

print("Calories under 20:", low)
print("Calories over 3000:", high)
print("Share removed (%):", round((low + high) / len(df) * 100, 1))

print("Ingredients type:", type(df["RecipeIngredientParts"].iloc[0]))

high_df = df[df["Calories"] > 3000]

print(high_df[["Name", "Calories", "RecipeServings", "RecipeYield"]].head(10))

print("Median servings (high-calorie rows):", high_df["RecipeServings"].median())
print("Median servings (all rows):", df["RecipeServings"].median())