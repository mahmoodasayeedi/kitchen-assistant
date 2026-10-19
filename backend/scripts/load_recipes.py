import json
import re
import sqlite3
from pathlib import Path

import pandas as pd

ROWS_TO_READ = 10000
MIN_CAL = 20
MAX_CAL = 2000

BACKEND = Path(__file__).resolve().parent.parent
CSV_PATH = BACKEND / "data" / "recipes.csv"
DB_PATH = BACKEND / "db" / "kitchen.db"

PATTERN = re.compile(r'"((?:[^"\\]|\\.)*)"')


def parse_r_list(text):
    if not isinstance(text, str):
        return []
    return [step.replace('\\"', '"') for step in PATTERN.findall(text)]


def clean_number(x):
    return None if pd.isna(x) else float(x)


def clean_text(x):
    return None if pd.isna(x) else str(x)


df = pd.read_csv(CSV_PATH, nrows=ROWS_TO_READ)
print("Rows read:", len(df))

bad = (
    df["Name"].isna()
    | df["Calories"].isna()
    | (df["Calories"] < MIN_CAL)
    | (df["Calories"] > MAX_CAL)
    | ((df["RecipeServings"] <= 1) & (df["Calories"] > 1000))
    | df["RecipeIngredientParts"].isna()
    | (df["RecipeIngredientParts"] == "character(0)")
    | df["Name"].duplicated()
)
df = df[~bad].copy()

df["ingredients_list"] = df["RecipeIngredientParts"].apply(parse_r_list)
df["steps_list"] = df["RecipeInstructions"].apply(parse_r_list)
df = df[df["ingredients_list"].str.len() > 0]
print("Rows after cleaning:", len(df))

rows = [
    (
        int(rid),
        name,
        json.dumps(ings, ensure_ascii=False),
        clean_number(cal),
        clean_number(serv),
        clean_text(cat),
        json.dumps(steps, ensure_ascii=False),
    )
    for rid, name, ings, cal, serv, cat, steps in zip(
        df["RecipeId"],
        df["Name"],
        df["ingredients_list"],
        df["Calories"],
        df["RecipeServings"],
        df["RecipeCategory"],
        df["steps_list"],
    )
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

before = cur.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
cur.executemany(
    """
    INSERT OR IGNORE INTO recipes
    (recipe_id, name, ingredients, calories, servings, category, instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
    rows,
)
conn.commit()
after = cur.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
conn.close()

print("Rows in table before:", before)
print("Rows in table after:", after)