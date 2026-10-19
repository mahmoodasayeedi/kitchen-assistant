import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "kitchen.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

total = cur.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
print("Total recipes:", total)

top = cur.execute("""
    SELECT category, COUNT(*) AS n
    FROM recipes
    GROUP BY category
    ORDER BY n DESC
    LIMIT 10
""").fetchall()

print("\nTop 10 categories:")
for category, n in top:
    print(f"{category}: {n} ({n / total * 100:.1f}%)")

avg = cur.execute("""
    SELECT category, ROUND(AVG(calories), 1) AS avg_cal, COUNT(*) AS n
    FROM recipes
    GROUP BY category
    ORDER BY n DESC
    LIMIT 3
""").fetchall()

print("\nAverage calories, 3 biggest categories:")
for category, avg_cal, n in avg:
    print(f"{category}: {avg_cal} kcal ({n} recipes)")

conn.close()