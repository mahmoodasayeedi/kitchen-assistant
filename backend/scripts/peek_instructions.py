import pandas as pd

df = pd.read_csv("data/recipes.csv", nrows=5)

print(df["RecipeCategory"])

first = df["RecipeInstructions"].iloc[0]
print("Type:", type(first))
print("First 300 characters:")
print(first[:300])
print("Starts with c( ?", first.startswith("c("))