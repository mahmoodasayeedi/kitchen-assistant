import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_json("data/train.json")

train_df, val_df = train_test_split(
    df, test_size=0.2, random_state=42, stratify=df["cuisine"]
)

print("Train size:", len(train_df))
print("Validation size:", len(val_df))
print("Brazilian in train:", (train_df["cuisine"] == "brazilian").sum())
print("Brazilian in validation:", (val_df["cuisine"] == "brazilian").sum())
print(val_df["cuisine"].value_counts(normalize=True).head(3))