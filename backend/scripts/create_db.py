import sqlite3
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent / "db"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "kitchen.db"

conn = sqlite3.connect(DB_PATH)

cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS recipes (
    recipe_id    INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    ingredients  TEXT NOT NULL,
    calories     REAL,
    servings     REAL,
    category     TEXT,
    instructions TEXT
)
""")

conn.commit()

print("Database ready")

print(conn.execute('PRAGMA table_info(recipes)').fetchall())

conn.close()