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

# Dish types where a savoury-cuisine guess makes no sense (hide the tag for these)
NO_CUISINE_CATEGORIES = {
    "Dessert", "Beverages", "Breads", "Quick Breads", "Pie", "Cheesecake",
    "Frozen Desserts", "Bar Cookie", "Candy", "Cookie & Brownies", "Drop Cookies",
}

# ---- runs once, when the server imports this file ----
_conn = sqlite3.connect(DB_PATH)
_rows = _conn.execute("""
    SELECT r.recipe_id, r.name, r.calories, r.category, r.cuisine_pred,
           r.ingredients, e.embedding
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
    return {normalize_word(w) for w in text.split()}


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
            "score": round(float(scores[i]), 3),
            "have": have,
            "assumed_at_home": staples,
            "to_buy": to_buy,
            "can_cook_now": len(to_buy) == 0,
        })
    return results