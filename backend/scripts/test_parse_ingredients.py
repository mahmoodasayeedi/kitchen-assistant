import re
import pandas as pd


def parse_ingredients(text):
    if not isinstance(text, str):
        return []
    return re.findall(r'"([^"]*)"', text)


sample = 'c("blueberries", "granulated sugar", "lemon juice")'
result = parse_ingredients(sample)
print(result)
print("Count:", len(result))

df = pd.read_csv("data/recipes.csv", nrows=5)
df["ingredients_list"] = df["RecipeIngredientParts"].apply(parse_ingredients)
print(df[["Name", "ingredients_list"]])
print("Type:", type(df["ingredients_list"].iloc[0]))