import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "kitchen.db"

conn = sqlite3.connect(DB_PATH)
conn.execute("""
CREATE TABLE IF NOT EXISTS recipe_embeddings (
    recipe_id INTEGER PRIMARY KEY,
    model     TEXT NOT NULL,
    embedding BLOB NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id)
)
""")
conn.commit()
conn.close()
print("recipe_embeddings table ready")