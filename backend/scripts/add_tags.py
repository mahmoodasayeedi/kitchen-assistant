import json
import sqlite3
from pathlib import Path

import joblib

BACKEND = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND / "db" / "kitchen.db"
MODEL_DIR = BACKEND / "models"

cuisine = joblib.load(MODEL_DIR / "cuisine_model.joblib")
calorie = joblib.load(MODEL_DIR / "calorie_model.joblib")

conn = sqlite3.connect(DB_PATH)
existing = [r[1] for r in conn.execute("PRAGMA table_info(recipes)")]
for col, col_type in [("cuisine_pred", "TEXT"), ("calories_pred", "REAL")]:
    if col not in existing:
        conn.execute(f"ALTER TABLE recipes ADD COLUMN {col} {col_type}")

rows = conn.execute("SELECT recipe_id, ingredients FROM recipes").fetchall()
ids = [r[0] for r in rows]
texts = [" ".join(json.loads(r[1])) for r in rows]

cuisines = cuisine["model"].predict(cuisine["vectorizer"].transform(texts))
calories = calorie.predict(texts)

conn.executemany(
      "UPDATE recipes SET cuisine_pred = ? WHERE recipe_id = ?",
      [(str(c), i) for c, i in zip(cuisines, ids)],
  )
conn.commit()

print("Tagged", len(ids), "recipes")
for name, n in conn.execute(
    "SELECT cuisine_pred, COUNT(*) FROM recipes GROUP BY cuisine_pred ORDER BY COUNT(*) DESC LIMIT 5"
):
    print(f"  {name}: {n}")
print(conn.execute("SELECT name, cuisine_pred, calories, calories_pred FROM recipes LIMIT 3").fetchall())
conn.close()