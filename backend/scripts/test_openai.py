from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

response = client.responses.create(
    model="gpt-6-luna",
    input="what is your special feature?",
)
print(response.output_text)