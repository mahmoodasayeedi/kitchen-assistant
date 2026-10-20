import json
import sqlite3
from pathlib import Path

import joblib
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline

BACKEND = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND / "db" / "kitchen.db"
MODEL_DIR = BACKEND / "models"
MODEL_DIR.mkdir(exist_ok=True)

conn = sqlite3.connect(DB_PATH)
df = pd.read_sql_query("SELECT name, ingredients, calories FROM recipes WHERE calories <= 1000", conn)
df["text"] = df["ingredients"].apply(lambda s: " ".join(json.loads(s)))

train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)
print("Train:", len(train_df), "| Validation:", len(val_df))
print("Validation calories: mean", round(val_df["calories"].mean()), "| median", round(val_df["calories"].median()))

models = {
    "Baseline (median)": make_pipeline(TfidfVectorizer(min_df=3), DummyRegressor(strategy="median")),
    "Ridge": make_pipeline(TfidfVectorizer(min_df=3), Ridge(alpha=1.0)),
    "Random Forest": make_pipeline(
        TfidfVectorizer(min_df=3),
        RandomForestRegressor(n_estimators=100, min_samples_leaf=2, max_features=0.3, random_state=42, n_jobs=-1),
    ),
}

results = {}
for name, model in models.items():
    model.fit(train_df["text"], train_df["calories"])
    pred = model.predict(val_df["text"])
    mae = mean_absolute_error(val_df["calories"], pred)
    r2 = r2_score(val_df["calories"], pred)
    results[name] = (mae, r2, pred, model)
    print(f"{name}: MAE {mae:.1f} kcal | R2 {r2:.3f}")

real = {k: v for k, v in results.items() if not k.startswith("Baseline")}
best_name = min(real, key=lambda k: real[k][0])
best_pred, best_model = real[best_name][2], real[best_name][3]
print("\nBest by MAE:", best_name)

check = val_df.assign(predicted=best_pred.round())
check["error"] = (check["predicted"] - check["calories"]).abs()
print("\nBiggest misses:")
print(check.sort_values("error", ascending=False)[["name", "calories", "predicted"]].head(5).to_string(index=False))

joblib.dump(best_model, MODEL_DIR / "calorie_model.joblib")
print("\nSaved", MODEL_DIR / "calorie_model.joblib")