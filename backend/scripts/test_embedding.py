import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

EMBED_MODEL = "text-embedding-3-small"

texts = [
    "eggs, tomato, onion",
    "scrambled eggs with tomato",
    "chocolate cake with frosting",
]

response = client.embeddings.create(model=EMBED_MODEL, input=texts)

vectors = [np.array(item.embedding) for item in response.data]

print("Number of embeddings:", len(vectors))
print("Length of one embedding:", len(vectors[0]))
print("First 5 values:", vectors[0][:5])


def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


print("Text 1 vs text 2:", round(cosine(vectors[0], vectors[1]), 3))
print("Text 1 vs text 3:", round(cosine(vectors[0], vectors[2]), 3))