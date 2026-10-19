import json
import sqlite3
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

EMBED_MODEL = "text-embedding-3-small"
BATCH_SIZE = 100
LIMIT = 100000

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "kitchen.db"


def build_text(name, ingredients_json):
    ingredients = json.loads(ingredients_json)
    return f"{name}. Ingredients: {', '.join(ingredients)}"


conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

todo = cur.execute(
    """
    SELECT r.recipe_id, r.name, r.ingredients
    FROM recipes r
    LEFT JOIN recipe_embeddings e ON e.recipe_id = r.recipe_id
    WHERE e.recipe_id IS NULL
    ORDER BY r.recipe_id
    LIMIT ?
    """,
    (LIMIT,),
).fetchall()
print("Recipes to embed:", len(todo))

done = 0
for start in range(0, len(todo), BATCH_SIZE):
    batch = todo[start : start + BATCH_SIZE]
    texts = [build_text(name, ing) for _, name, ing in batch]

    response = client.embeddings.create(model=EMBED_MODEL, input=texts)

    rows = []
    for (recipe_id, _, _), item in zip(batch, response.data):
        vector = np.array(item.embedding, dtype=np.float32)
        rows.append((recipe_id, EMBED_MODEL, vector.tobytes()))

    cur.executemany(
        "INSERT OR IGNORE INTO recipe_embeddings (recipe_id, model, embedding) VALUES (?, ?, ?)",
        rows,
    )
    conn.commit()

    done += len(batch)
    print(f"Embedded {done}/{len(todo)}")

total = cur.execute("SELECT COUNT(*) FROM recipe_embeddings").fetchone()[0]
print("Total embeddings stored:", total)
conn.close()