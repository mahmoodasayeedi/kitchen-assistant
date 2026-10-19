import pandas as pd

train = pd.read_json("data/train.json")

counts = train["cuisine"].value_counts()
baseline = counts.iloc[0] / len(train)
print("Most common cuisine:", counts.index[0])
print("Lazy baseline accuracy:", round(baseline * 100, 1), "%")

test = pd.read_json("data/test.json")
print("Test shape:", test.shape)
print("Test columns:", list(test.columns))