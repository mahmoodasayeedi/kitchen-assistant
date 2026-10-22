from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()
MODEL = "gpt-image-2.5-flare"


def illustrate(title, ingredients):
    names = ", ".join(i[:40] for i in ingredients[:8])
    prompt = (
        f"Appetizing overhead food photograph of {title[:100]}"
        + (f", made with {names}" if names else "")
        + ". Natural window light, rustic table, shallow depth of field. "
        "No text, letters, logos or watermarks."
    )
    try:
        result = client.images.generate(model=MODEL, prompt=prompt, size="1024x1024", quality="low")
    except Exception:
        result = client.images.generate(model=MODEL, prompt=prompt)
    return "data:image/png;base64," + result.data[0].b64_json