import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "train.json"

df = pd.read_json(DATA_PATH)
df["text"] = df["ingredients"].apply(lambda items: " ".join(items))
print("Example text:", df["text"].iloc[0])

train_df, val_df = train_test_split(
    df, test_size=0.2, random_state=42, stratify=df["cuisine"]
)

vectorizer = TfidfVectorizer(min_df=2)
X_train = vectorizer.fit_transform(train_df["text"])
X_val = vectorizer.transform(val_df["text"])

print("X_train shape:", X_train.shape)
print("X_val shape:", X_val.shape)

filled = X_train.nnz / (X_train.shape[0] * X_train.shape[1]) * 100
print(f"Non-zero cells: {filled:.2f}%")

words = vectorizer.get_feature_names_out()
order = np.argsort(vectorizer.idf_)
print("\nLowest weight (most common) words:")
for i in order[:10]:
    print(f"  {words[i]}: {vectorizer.idf_[i]:.2f}")

print("\nSome words you can compare:")
for w in ["salt", "soy", "tahini", "sauce"]:
    if w in vectorizer.vocabulary_:
        print(f"  {w}: {vectorizer.idf_[vectorizer.vocabulary_[w]]:.2f}")