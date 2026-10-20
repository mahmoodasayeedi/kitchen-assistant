import re
import sqlite3
from pathlib import Path

import pandas as pd

BACKEND = Path(__file__).resolve().parent.parent
CSV_PATH = BACKEND / "data" / "recipes.csv"
DB_PATH = BACKEND / "db" / "kitchen.db"

PATTERN = re.compile(r'"((?:[^"\\]|\\.)*)"')


def first_image(value):
    if not isinstance(value, str):
        return None
    for url in PATTERN.findall(value):
        if url.startswith("https://"):
            return url
    return None


df = pd.read_csv(CSV_PATH, nrows=10000, usecols=["RecipeId", "Images"])
print("Raw examples:")
for v in df["Images"].head(3):
    print("  ", str(v)[:140])

rows = [(first_image(img), int(rid)) for rid, img in zip(df["RecipeId"], df["Images"])]

conn = sqlite3.connect(DB_PATH)
existing = [r[1] for r in conn.execute("PRAGMA table_info(recipes)")]
if "image_url" not in existing:
    conn.execute("ALTER TABLE recipes ADD COLUMN image_url TEXT")

conn.executemany("UPDATE recipes SET image_url = ? WHERE recipe_id = ?", rows)
conn.commit()

print("\nRecipes with a photo:", conn.execute("SELECT COUNT(image_url), COUNT(*) FROM recipes").fetchone())
print(conn.execute("SELECT name, image_url FROM recipes WHERE image_url IS NOT NULL LIMIT 2").fetchall())
conn.close()