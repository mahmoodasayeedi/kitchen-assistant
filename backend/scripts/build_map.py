import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score

BACKEND = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND / "db" / "kitchen.db"
MODEL_DIR = BACKEND / "models"
MODEL_DIR.mkdir(exist_ok=True)

conn = sqlite3.connect(DB_PATH)
rows = conn.execute("""
    SELECT r.recipe_id, r.name, r.category, r.calories, e.embedding
    FROM recipes r JOIN recipe_embeddings e ON e.recipe_id = r.recipe_id
""").fetchall()
conn.close()

X = np.vstack([np.frombuffer(r[4], dtype=np.float32) for r in rows])
X = X / np.linalg.norm(X, axis=1, keepdims=True)
print("Embeddings:", X.shape)

best_k, best_score = None, -1
for k in [6, 8, 10, 12, 15]:
    labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X)
    score = silhouette_score(X, labels, sample_size=3000, random_state=42)
    print(f"k={k}: silhouette {score:.3f}")
    if score > best_score:
        best_k, best_score, best_labels = k, score, labels
print("Chosen k:", best_k)

reduced = PCA(n_components=50, random_state=42).fit_transform(X)
coords = TSNE(n_components=2, perplexity=30, init="pca", random_state=42).fit_transform(reduced)
coords = (coords - coords.min(axis=0)) / (coords.max(axis=0) - coords.min(axis=0))

df = pd.DataFrame({
    "recipe_id": [r[0] for r in rows],
    "name": [r[1] for r in rows],
    "category": [r[2] for r in rows],
    "calories": [r[3] for r in rows],
    "cluster": best_labels,
    "x": coords[:, 0].round(4),
    "y": coords[:, 1].round(4),
})

for c in sorted(df["cluster"].unique()):
    sub = df[df["cluster"] == c]
    top_cats = ", ".join(sub["category"].value_counts().head(3).index)
    examples = "; ".join(sub["name"].sample(4, random_state=1))
    print(f"\nCluster {c} ({len(sub)} recipes) | top categories: {top_cats}\n  e.g. {examples}")

df.to_json(MODEL_DIR / "recipe_map.json", orient="records")
print("\nSaved", MODEL_DIR / "recipe_map.json")