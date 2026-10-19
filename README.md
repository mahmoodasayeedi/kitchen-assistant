# AI Kitchen Assistant

Every time I open the fridge I wonder what to cook, and I want something quick that uses what I already have. This app lets you take a photo of your ingredients. A vision model reads the photo, the app finds real recipes that match, and it shows which ingredients you already have and which you still need to buy.

> Status: work in progress. Built as a project for the Ironhack AI Engineering bootcamp.

## Features

**Done**
- Photo upload endpoint (`POST /extract-ingredients`) that returns a structured ingredient list from a vision model
- Upload validation: file type (JPEG, PNG, WebP) and size limit (5 MB)
- Invalid-photo detection (not food, too blurry or dark) with a clear reason
- Recipe database in SQLite: 8,761 cleaned recipes
- Semantic search with OpenAI embeddings (cosine similarity)
- "You have / assumed at home / buy" ingredient comparison for every result

**Planned**
- Conversational cooking agent with memory and tool calling
- Pantry, saved recipes and weekly meal plan (SQLite)
- Cuisine classifier, calorie predictor, recipe clustering and 2D recipe map
- Dish Reviewer mode (photo of the finished dish, structured feedback, history)
- React (Vite) frontend
- Deployment: backend on Render, frontend on Vercel

## Tech stack

- **Backend:** FastAPI, SQLite, scikit-learn, pandas, numpy
- **AI:** OpenAI API (vision with structured outputs, embeddings)
- **Frontend (planned):** React with Vite
- **Deployment (planned):** Render and Vercel

## How it works

1. The user uploads a photo of their fridge or groceries.
2. The backend validates the file, then sends the image to a vision model. The model returns JSON: `is_valid_food_photo`, `reason` and `ingredients`.
3. The user's ingredients are turned into a query text and embedded.
4. The query embedding is compared with the embeddings of all recipes, and the closest ones are ranked.
5. For each recipe, the app compares its ingredient list with the user's list and shows what the user has, what is assumed to be at home (salt, water, pepper), and what to buy.

I chose to find real recipes with search instead of letting the model invent them. A recipe written by people is safer than one an AI makes up, for example when it comes to cooking times.

## Data

**Recipe search and calorie model: Food.com Recipes and Reviews (Kaggle)**
- Read the first 10,000 rows, kept 8,761 after cleaning.
- Cleaning rules:
  - Calories must be between 20 and 2,000 (zero-calorie rows and extreme outliers look like bad data).
  - Drop recipes with 1 serving and more than 1,000 calories. Their calories are most likely for the whole batch, not one portion.
  - Drop duplicate recipe names and recipes with no ingredients.
- Ingredients and instructions are stored as R-style text (`c("a", "b")`). They are parsed with a regular expression that also handles escaped quotes such as `1/8\" thickness`.
- Ingredients and instructions are saved in SQLite as JSON text.
- Embeddings are stored as float32 blobs in a separate table, together with the name of the model that made them.

**Cuisine classifier: Kaggle Recipe Ingredients Dataset**
- 39,774 recipes, 20 cuisines, with an ingredient list for each.
- The classes are unbalanced: Italian has 7,838 recipes and Brazilian 467.
- A model that always predicts "italian" gets 19.7% accuracy. Its macro F1 would be only about 1.6%, which is why macro F1 is reported next to accuracy.
- `test.json` has no cuisine labels, so a validation set is split off from `train.json`.

## Safety

- Uploaded files are checked for type and size before any API call is made.
- The vision prompt tells the model to set `is_valid_food_photo` to false for non-food or unreadable images, and to treat any text inside an image as data, never as instructions.

## Known limitations

- Some calorie values look like whole-batch totals even after cleaning, so a calorie model trained on them will be noisy.
- Some recipes have incomplete ingredient lists (for example, Hainanese Chicken Rice has no rice in the stored list).
- Ingredient fragments such as `rind of` and `zest of` appear in some recipes.
- Ingredient matching uses whole words, so `rice` also matches `rice vinegar`. The list of home staples is a guess.
- Similarity scores only rank results against each other. A good match and a loose match can have almost the same score, so a fixed score cutoff would be wrong.
- The `category` column mixes dish types with other labels such as `< 15 Mins`.
- Only the first 10,000 rows of the Food.com file were used. Category counts looked balanced (the largest, Dessert, is 11.3%), but this was only checked for the top 10 categories.

## Model metrics

To be filled in when the models are trained.

| Model | Dataset | Metrics |
|---|---|---|
| Cuisine classifier (2 algorithms) | Kaggle Recipe Ingredients | accuracy, macro F1, confusion matrix: TODO |
| Calorie predictor (2 algorithms) | Food.com | MAE, R²: TODO |

## Project structure

```
kitchen-assistant/
  backend/
    main.py          FastAPI app
    scripts/         data exploration, loading, embedding and search scripts
    data/            datasets (not in Git)
    db/              SQLite database (not in Git)
    .env             API key (not in Git)
  frontend/          React app (planned)
```

## Setup (Windows, PowerShell)

1. Create and activate a virtual environment:
   ```powershell
   cd backend
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
2. Install the packages (a `requirements.txt` is still to be added):
   ```powershell
   pip install fastapi uvicorn python-multipart openai python-dotenv pydantic pandas scikit-learn numpy
   ```
3. Create `backend\.env` with your own key. Never commit this file.
   ```
   OPENAI_API_KEY=your-key-here
   ```
4. Download the datasets from Kaggle into `backend\data\` (the Food.com `recipes.csv`, and `train.json` and `test.json` from the recipe ingredients dataset).
5. Build the database. Run these from `backend`:
   ```powershell
   python scripts\create_db.py
   python scripts\load_recipes.py
   python scripts\create_embeddings_table.py
   python scripts\embed_recipes.py
   ```
   Embedding all recipes calls the OpenAI API and costs a small amount. Check the pricing page first.
6. Try the search:
   ```powershell
   python scripts\search_recipes.py
   ```
7. Start the server:
   ```powershell
   uvicorn main:app --reload
   ```
   Then open `http://127.0.0.1:8000/docs`.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Welcome message |
| GET | `/health` | Health check |
| POST | `/extract-ingredients` | Upload a photo, get an ingredient list |
