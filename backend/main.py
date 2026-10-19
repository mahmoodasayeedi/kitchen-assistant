
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Literal
from src.recipe_generator import generate_recipe

app = FastAPI(title="AI Kitchen Assistant")


class RecipeRequest(BaseModel):
    ingredients: list[str]
    preferences: list[str] = []


class RecipeResponse(BaseModel):
    title: str
    difficulty: Literal["easy", "medium", "hard"]
    cooking_steps: list[str]


@app.get("/")
def home():
    return {"message": "AI Kitchen Assistant API is running!"}


@app.post("/recipes", response_model=RecipeResponse)

@app.post("/recipes", response_model=RecipeResponse)
def create_recipe(request: RecipeRequest):
    ingredients = [
        item.strip()
        for item in request.ingredients
        if item.strip()
    ]

    if not ingredients:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least one ingredient."
        )

    try:
        recipe = generate_recipe(
            ingredients,
            request.preferences
        )
        return recipe

    except Exception:
        # Log the full error in your terminal,
        # but don't expose API details to the user.
        import logging
        logging.exception("Recipe generation failed")

        raise HTTPException(
            status_code=502,
            detail="Recipe generation failed. Please try again."
        )
