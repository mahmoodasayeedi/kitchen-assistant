from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()
client = OpenAI()


class IngredientList(BaseModel):
    ingredients: list[str]


response = client.responses.parse(
    model="gpt-6-luna",
    input=[
        {"role": "system", "content": "Extract the ingredient names from the user's text. Return names only, no quantities."},
        {"role": "user", "content": "eggs, 2 tomatoes, half an onion, milk"},
    ],
    text_format=IngredientList,
)

print(response.output_parsed.ingredients)