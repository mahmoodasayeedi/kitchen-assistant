import json
import sqlite3
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

EMBED_MODEL = "text-embedding-3-small"
DB_PATH = Path(__file__).resolve().parent.parent / "db" / "kitchen.db"

conn = sqlite3.connect(DB_PATH)
rows = conn.execute("""
    SELECT r.recipe_id, r.name, r.ingredients, e.embedding
    FROM recipes r
    JOIN recipe_embeddings e ON e.recipe_id = r.recipe_id
""").fetchall()
conn.close()

ids = [row[0] for row in rows]
names = [row[1] for row in rows]
recipe_items = [json.loads(row[2]) for row in rows]
matrix = np.vstack([np.frombuffer(row[3], dtype=np.float32) for row in rows])
matrix = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
print("Loaded matrix:", matrix.shape)



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

STAPLES = {"water", "salt", "pepper", "black pepper"}


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
    query = "Ingredients: " + ", ".join(ingredients)
    response = client.embeddings.create(model=EMBED_MODEL, input=[query])
    q = np.array(response.data[0].embedding, dtype=np.float32)
    q = q / np.linalg.norm(q)

    scores = matrix @ q
    best = np.argsort(scores)[::-1][:top_k]

    results = []
    for i in best:
        have, staples, to_buy = have_missing(ingredients, recipe_items[i])
        results.append((ids[i], names[i], float(scores[i]), have, staples, to_buy))
    return results


for recipe_id, name, score, have, staples, to_buy in search(["rice", "chicken", "onion"]):
    print(f"\n{score:.3f} {name} (id {recipe_id})")
    print("  You have:", ", ".join(have) or "nothing from this recipe")
    if staples:
        print("  Assumed at home:", ", ".join(staples))
    if to_buy:
        print("  Buy:", ", ".join(to_buy))
    else:
        print("  You have everything. You can cook this now!")