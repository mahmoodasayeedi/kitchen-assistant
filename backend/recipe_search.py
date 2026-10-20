import json
import sqlite3
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

EMBED_MODEL = "text-embedding-3-small"
DB_PATH = Path(__file__).resolve().parent / "db" / "kitchen.db"
STAPLES = {"water", "salt", "pepper", "black pepper"}
MODIFIERS = {
    "raw", "fresh", "frozen", "cooked", "chopped", "sliced", "diced",
    "large", "small", "medium", "ripe", "organic", "baby",
    "boneless", "skinless",
}
NO_CUISINE_CATEGORIES = {
    "Dessert", "Beverages", "Breads", "Quick Breads", "Pie", "Cheesecake",
    "Frozen Desserts", "Bar Cookie", "Candy", "Cookie & Brownies", "Drop Cookies",
}

# ---- runs once, when the server imports this file ----
_conn = sqlite3.connect(DB_PATH)
_rows = _conn.execute("""
    SELECT r.recipe_id, r.name, r.calories, r.category, r.cuisine_pred,
           r.ingredients, e.embedding, r.total_minutes, r.image_url
    FROM recipes r
    JOIN recipe_embeddings e ON e.recipe_id = r.recipe_id
""").fetchall()
_conn.close()

IDS = [row[0] for row in _rows]
NAMES = [row[1] for row in _rows]
CALORIES = [row[2] for row in _rows]
CATEGORIES = [row[3] for row in _rows]
CUISINES = [row[4] for row in _rows]
RECIPE_ITEMS = [json.loads(row[5]) for row in _rows]
MATRIX = np.vstack([np.frombuffer(row[6], dtype=np.float32) for row in _rows])
MATRIX = MATRIX / np.linalg.norm(MATRIX, axis=1, keepdims=True)
TOTAL_MINUTES = [row[7] for row in _rows]
IMAGES = [row[8] for row in _rows]
print("Recipe search ready:", MATRIX.shape)


# ---- runs on every request ----
def normalize_word(word):
    word = word.lower().strip()
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("oes") and len(word) > 4:
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss") and len(word) > 3:
        return word[:-1]
    return word


def words_of(text):
    words = {normalize_word(w) for w in text.split()}
    core = words - MODIFIERS
    return core or words


def have_missing(user_ingredients, items):
    user_sets = [words_of(u) for u in user_ingredients]
    have, staples, to_buy = [], [], []
    for item in dict.fromkeys(items):
        item_words = words_of(item)
        if any(u and u <= item_words for u in user_sets):
            have.append(item)
        elif item.lower().strip() in STAPLES:
            staples.append(item)
        else:
            to_buy.append(item)
    return have, staples, to_buy


def search(ingredients, top_k=5):
    cleaned = [i.strip() for i in ingredients if i.strip()]
    if not cleaned:
        raise ValueError("No ingredients given")

    query = "Ingredients: " + ", ".join(cleaned)
    response = client.embeddings.create(model=EMBED_MODEL, input=[query])
    q = np.array(response.data[0].embedding, dtype=np.float32)
    q = q / np.linalg.norm(q)

    scores = MATRIX @ q
    best = np.argsort(scores)[::-1][:top_k]

    results = []
    for i in best:
        have, staples, to_buy = have_missing(cleaned, RECIPE_ITEMS[i])
        results.append({
            "recipe_id": IDS[i],
            "name": NAMES[i],
            "calories": CALORIES[i],
            "category": CATEGORIES[i],
            "cuisine_guess": None if CATEGORIES[i] in NO_CUISINE_CATEGORIES else CUISINES[i],
            "total_minutes": TOTAL_MINUTES[i],
            "image_url": IMAGES[i],
            "score": round(float(scores[i]), 3),
            "have": have,
            "assumed_at_home": staples,
            "to_buy": to_buy,
            "can_cook_now": len(to_buy) == 0,
        })
    return results


def browse(q=None, category=None, max_minutes=None, with_photo=True, limit=24, offset=0):
    where, params = [], []
    if q:
        where.append("name LIKE ?")
        params.append(f"%{q}%")
    if category:
        where.append("category = ?")
        params.append(category)
    if max_minutes:
        where.append("total_minutes IS NOT NULL AND total_minutes <= ?")
        params.append(max_minutes)
    if with_photo:
        where.append("image_url IS NOT NULL")
    clause = ("WHERE " + " AND ".join(where)) if where else ""

    conn = sqlite3.connect(DB_PATH)
    total = conn.execute(f"SELECT COUNT(*) FROM recipes {clause}", params).fetchone()[0]
    rows = conn.execute(
        f"""
        SELECT recipe_id, name, category, calories, total_minutes, image_url
        FROM recipes {clause}
        ORDER BY recipe_id LIMIT ? OFFSET ?
        """,
        params + [limit, offset],
    ).fetchall()
    conn.close()

    items = [
        {
            "recipe_id": r[0], "name": r[1], "category": r[2],
            "calories": r[3], "total_minutes": r[4], "image_url": r[5],
        }
        for r in rows
    ]
    return {"items": items, "total": total}


def categories():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT category FROM recipes WHERE category IS NOT NULL
        GROUP BY category ORDER BY COUNT(*) DESC LIMIT 40
    """).fetchall()
    conn.close()
    return [r[0] for r in rows]


def get_recipe(recipe_id):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        """
        SELECT recipe_id, name, category, calories, servings, ingredients, instructions,
               prep_minutes, cook_minutes, total_minutes, image_url
        FROM recipes WHERE recipe_id = ?
        """,
        (recipe_id,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return {
        "recipe_id": row[0],
        "name": row[1],
        "category": row[2],
        "calories": row[3],
        "servings": row[4],
        "ingredients": json.loads(row[5]),
        "steps": json.loads(row[6]) if row[6] else [],
        "prep_minutes": row[7],
        "cook_minutes": row[8],
        "total_minutes": row[9],
        "image_url": row[10],
    }