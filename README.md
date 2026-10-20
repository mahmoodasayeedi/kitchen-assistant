# AI Kitchen Assistant

Every time I open the fridge I wonder what to cook, and I want something quick that uses what I already have. This app lets you take a photo of your ingredients. A vision model reads the photo, the app finds real recipes that match, and it shows which ingredients you already have and which you still need to buy.

> Status: work in progress. Built as a project for the Ironhack AI Engineering bootcamp.

## Features

**Done**
- Photo upload endpoint (`POST /extract-ingredients`) that returns a structured ingredient list from a vision model
- Upload validation: file type (JPEG, PNG, WebP) and size limit (5 MB)
- Invalid-photo detection (not food, too blurry or dark) with a clear reason
- Recipe database in SQLite: 8,761 cleaned recipes
- Semantic search with OpenAI embeddings (cosine similarity), exposed as `POST /search-recipes`
- "You have / assumed at home / buy" ingredient comparison for every result
- Cuisine classifier (two algorithms compared), with a cuisine guess stored for every recipe
- Calorie regression model (two algorithms compared, with an honest look at its limits)
- Recipe clustering (KMeans) and 2D map coordinates (PCA + t-SNE)

**Planned**
- Route that serves the recipe map, with the user's ingredients highlighted
- Conversational cooking agent with memory and tool calling
- Pantry, saved recipes and weekly meal plan (SQLite)
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

**Recipe search, calories and the map: Food.com Recipes and Reviews (Kaggle)**
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
- `test.json` has no cuisine labels, so a stratified 80/20 validation split is taken from `train.json`.

## Model metrics

### Cuisine classifier

Ingredients are joined into one string per recipe and converted with TF-IDF (2,331 words, words in fewer than 2 recipes ignored). The vocabulary is learned on the training split only, so the validation split does not leak into it. Scores are on 7,955 validation recipes.

| Model | Accuracy | Macro F1 |
|---|---|---|
| Baseline (always "italian") | 0.197 | 0.016 |
| Logistic Regression | 0.777 | 0.695 |
| **Linear SVC (chosen)** | **0.783** | **0.701** |

- The gap between the two real models is small (about 48 recipes out of 7,955) and comes from one split, so it is not strong evidence that Linear SVC is better.
- Best cuisines: Mexican (F1 0.91), Indian (0.88), Italian (0.85). Weakest: British (0.49), Russian (0.50), Irish (0.52), Vietnamese (0.56), Spanish (0.57).
- Most common confusions are between neighbouring cuisines that share ingredients: French predicted as Italian (105 times), Italian as French (66), Vietnamese as Thai (45), Greek as Italian (44), Cajun/Creole as Southern US (40). The full confusion matrix is saved as `models/confusion_matrix.csv`.

**Experiment: class weights.** With `class_weight="balanced"`, recall improved for rare cuisines (Russian 0.42 to 0.60, Irish 0.44 to 0.56) but precision fell more, so the scores dropped. I kept the unbalanced models.

| Model, balanced | Accuracy | Macro F1 |
|---|---|---|
| Logistic Regression | 0.742 | 0.674 |
| Linear SVC | 0.763 | 0.682 |

### Calorie predictor

Same TF-IDF idea on the ingredient names, predicting calories (the recipe's own value in the dataset). Scores on a 20% random validation split.

| Calorie cap | Model | MAE (kcal) | R² |
|---|---|---|---|
| 2,000 | Baseline (median) | 230.5 | -0.060 |
| 2,000 | Ridge | 233.3 | 0.019 |
| 2,000 | Random Forest | 231.6 | 0.011 |
| 1,000 | Baseline (median) | 172.2 | -0.037 |
| 1,000 | Ridge | 161.5 | 0.110 |
| 1,000 | Random Forest | 160.6 | 0.109 |

**Honest discussion of its limits**
- With the 2,000 cap, neither model beat a baseline that always guesses the median. The largest errors were muffins, fudge and fruitcake near 1,900 to 2,000 kcal that the model put at 200 to 380. These look like whole-batch totals, but I did not check their serving counts.
- Tightening the cap to 1,000 kcal helped: both models beat the baseline, by about 11 kcal of MAE (roughly 7%), with R² around 0.11. That is still weak: the model explains about a tenth of the variation.
- Ingredient names carry no amounts, so "butter, sugar, flour" fits both a small cookie and a large batch.
- The app therefore shows each recipe's own dataset calories and does not show model predictions.

### Clustering and recipe map

- KMeans on the recipe embeddings, with k tried at 6, 8, 10, 12 and 15. Silhouette scores were all low (0.031 to 0.036), so the clusters overlap and k is a judgement call. I used k = 15.
- Read by eye, the clusters form sensible themes: salads, Asian noodles and rice, chicken, baked sweets, drinks and frozen desserts, Indian dishes, pies, cookies and candy, soups, potatoes, Mexican and salsa, tomato and pasta dishes, beef and stews. One cluster (tuna, scones, dips) is a mixed leftover group.
- 2D coordinates come from PCA (to 50 dimensions) followed by t-SNE, scaled to 0 to 1 and saved to `models/recipe_map.json`.

## Safety

- Uploaded files are checked for type and size before any API call is made.
- The vision prompt tells the model to set `is_valid_food_photo` to false for non-food or unreadable images, and to treat any text inside an image as data, never as instructions.
- Search requests are validated: 1 to 30 ingredients, and a blank ingredient list returns a clear error.

## Known limitations

- Some calorie values look like whole-batch totals even after cleaning, so any calorie model trained on them is noisy.
- Some recipes have incomplete ingredient lists (for example, Hainanese Chicken Rice has no rice in the stored list).
- Ingredient fragments such as `rind of` and `zest of` appear in some recipes.
- Ingredient matching uses whole words, so `rice` also matches `rice vinegar`. The list of home staples is a guess.
- Similarity scores only rank results against each other. A good match and a loose match can have almost the same score, so a fixed score cutoff would be wrong.
- The `category` column mixes dish types with other labels such as `< 15 Mins`.
- The cuisine classifier knows only 20 mostly savoury cuisines and was trained on Kaggle's ingredient wording, but it is applied to Food.com recipes. Desserts and drinks get a wrong label (a frozen berry dessert was tagged French, a lemonade Italian), and 25% of recipes were tagged Southern US. The tag is only a guess, and its accuracy on Food.com recipes could not be measured.
- Only the first 10,000 rows of the Food.com file were used. Category counts looked balanced (the largest, Dessert, is 11.3%), but this was only checked for the top 10 categories.

## Project structure

```
kitchen-assistant/
  backend/
    main.py            FastAPI app
    recipe_search.py   embedding search, loaded once at startup
    scripts/           data exploration, loading, embedding, training and map scripts
    data/              datasets (not in Git)
    db/                SQLite database (not in Git)
    models/            trained models and map data (not in Git)
    .env               API key (not in Git)
  frontend/            React app (planned)
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
   pip install fastapi uvicorn python-multipart openai python-dotenv pydantic pandas scikit-learn numpy joblib
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
6. Train the models and build the map:
   ```powershell
   python scripts\train_cuisine.py
   python scripts\train_calories.py
   python scripts\build_map.py
   python scripts\add_tags.py
   ```
7. Try the search:
   ```powershell
   python scripts\search_recipes.py
   ```
8. Start the server:
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
| POST | `/search-recipes` | Send ingredients, get the closest recipes with have/buy lists |
