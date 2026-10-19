import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "kitchen.db"


def build_text(name, ingredients_json):
    ingredients = json.loads(ingredients_json)
    return f"{name}. Ingredients: {', '.join(ingredients)}"


conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

rows = cur.execute("SELECT name, ingredients FROM recipes LIMIT 5").fetchall()

for name, ingredients_json in rows:
    text = build_text(name, ingredients_json)
    print(len(text), "chars:", text)
    print()

all_rows = cur.execute("SELECT name, ingredients FROM recipes").fetchall()
lengths = [len(build_text(n, i)) for n, i in all_rows]

print("Recipes:", len(lengths))
print("Average length:", round(sum(lengths) / len(lengths), 1), "chars")
print("Longest:", max(lengths), "chars")

conn.close()