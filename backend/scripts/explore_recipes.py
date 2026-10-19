import pyarrow.parquet as pq

pf = pq.ParquetFile("data/test-00000-of-00004.parquet")
print("Total rows:", pf.metadata.num_rows)
print("Columns:", pf.schema_arrow.names)

first_batch = next(pf.iter_batches(batch_size=5000))
df = first_batch.to_pandas()

print("Sample shape:", df.shape)
print(df.head(3))
print("Example ingredients:", df["ingredients"].iloc[0])
print("Missing values per column:")
print(df.isna().sum())
print(df["calories"].describe())