import re
import sqlite3
from pathlib import Path

import pandas as pd

BACKEND = Path(__file__).resolve().parent.parent
CSV_PATH = BACKEND / "data" / "recipes.csv"
DB_PATH = BACKEND / "db" / "kitchen.db"

PATTERN = re.compile(r"^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$")


def to_minutes(value):
    if not isinstance(value, str):
        return None
    match = PATTERN.match(value.strip())
    if not match:
        return None
    days, hours, minutes, _seconds = (int(x) if x else 0 for x in match.groups())
    total = days * 1440 + hours * 60 + minutes
    return total if total > 0 else None


df = pd.read_csv(CSV_PATH, nrows=10000, usecols=["RecipeId", "PrepTime", "CookTime", "TotalTime"])
print("Raw examples:")
print(df.head(5).to_string(index=False))

rows = []
for rid, prep, cook, total in zip(df["RecipeId"], df["PrepTime"], df["CookTime"], df["TotalTime"]):
    p, c, t = to_minutes(prep), to_minutes(cook), to_minutes(total)
    if t is None and (p or c):
        t = (p or 0) + (c or 0)
    rows.append((p, c, t, int(rid)))

conn = sqlite3.connect(DB_PATH)
existing = [r[1] for r in conn.execute("PRAGMA table_info(recipes)")]
for col in ["prep_minutes", "cook_minutes", "total_minutes"]:
    if col not in existing:
        conn.execute(f"ALTER TABLE recipes ADD COLUMN {col} INTEGER")

conn.executemany(
    "UPDATE recipes SET prep_minutes = ?, cook_minutes = ?, total_minutes = ? WHERE recipe_id = ?",
    rows,
)
conn.commit()

print("\nRecipes with a total time:",
      conn.execute("SELECT COUNT(total_minutes), COUNT(*) FROM recipes").fetchone())
print("Under 30 minutes:", conn.execute("SELECT COUNT(*) FROM recipes WHERE total_minutes < 30").fetchone()[0])
print("Longest (minutes):", conn.execute("SELECT MAX(total_minutes) FROM recipes").fetchone()[0])
print(conn.execute("SELECT name, prep_minutes, cook_minutes, total_minutes FROM recipes LIMIT 3").fetchall())
conn.close()