from dotenv import load_dotenv
import os

load_dotenv()

key = os.getenv("OPENAI_API_KEY")

print("Found:", key is not None)
print("Length:", len(key) if key else 0)