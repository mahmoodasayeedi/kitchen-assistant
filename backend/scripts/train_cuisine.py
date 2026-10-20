import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC

BACKEND = Path(__file__).resolve().parent.parent
DATA_PATH = BACKEND / "data" / "train.json"
MODEL_DIR = BACKEND / "models"
MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_json(DATA_PATH)
df["text"] = df["ingredients"].apply(lambda items: " ".join(items))

train_df, val_df = train_test_split(
    df, test_size=0.2, random_state=42, stratify=df["cuisine"]
)

vectorizer = TfidfVectorizer(min_df=2)
X_train = vectorizer.fit_transform(train_df["text"])
X_val = vectorizer.transform(val_df["text"])
y_train = train_df["cuisine"]
y_val = val_df["cuisine"]
print("X_train:", X_train.shape, "| X_val:", X_val.shape)

models = {
    "Baseline (most common)": DummyClassifier(strategy="most_frequent"),
    "Logistic Regression": LogisticRegression(max_iter=1000),
"Linear SVC": LinearSVC(),
}

results = {}
for name, model in models.items():
    start = time.time()
    model.fit(X_train, y_train)
    pred = model.predict(X_val)
    acc = accuracy_score(y_val, pred)
    macro_f1 = f1_score(y_val, pred, average="macro")
    results[name] = (acc, macro_f1, pred, model)
    print(f"{name}: accuracy {acc:.3f} | macro F1 {macro_f1:.3f} | {time.time() - start:.0f}s")

real = {k: v for k, v in results.items() if not k.startswith("Baseline")}
best_name = max(real, key=lambda k: real[k][1])
best_pred, best_model = real[best_name][2], real[best_name][3]
print("\nBest by macro F1:", best_name)

labels = sorted(df["cuisine"].unique())
print("\n", classification_report(y_val, best_pred, labels=labels, digits=2))

cm = confusion_matrix(y_val, best_pred, labels=labels)
pd.DataFrame(cm, index=labels, columns=labels).to_csv(MODEL_DIR / "confusion_matrix.csv")

off_diagonal = cm.copy()
np.fill_diagonal(off_diagonal, 0)
print("Most common mistakes:")
for flat in np.argsort(off_diagonal, axis=None)[::-1][:5]:
    row, col = divmod(flat, len(labels))
    print(f"  {labels[row]} predicted as {labels[col]}: {off_diagonal[row, col]} times")

joblib.dump(
    {"vectorizer": vectorizer, "model": best_model, "labels": labels},
    MODEL_DIR / "cuisine_model.joblib",
)
print("\nSaved model to", MODEL_DIR / "cuisine_model.joblib")