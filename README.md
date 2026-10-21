# AI Kitchen Assistant 🍳

Turn the ingredients you already have into dinner. Upload a photo of your fridge or describe what you feel like cooking, and the app creates a recipe, plans your meals, and reviews the dish you cooked. Real recipes written by real cooks are shown next to the AI's suggestions.

> **Idea in one line:** AI creates, real recipes validate.

Built for the Ironhack AI Engineering bootcamp with **React (Vite)**, **FastAPI**, **scikit-learn**, **SQLite** and the **OpenAI API**.

---

## Features

| Tab                     | What it does                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **All recipes**         | Browse 8,761 real recipes with photos. Search by name, filter by category and cooking time, open any recipe for the full ingredients and steps.                                                                                                     |
| **AI Recipe Generator** | Chat with the assistant. Upload a fridge photo (ingredients are read by a vision model and are editable) or just type an idea. The assistant asks short questions, then writes a recipe. Similar real recipes from the database are shown below it. |
| **AI Meal Planner**     | Say how many days (1–7) and which meals (breakfast, lunch, dinner). The assistant builds a plan shown as day cards, and you can ask it to change the plan. Printable.                                                                               |
| **AI Dish Reviewer**    | Upload a photo of the dish you cooked. Get an overall score, five sub-scores, strengths, improvements and tips.                                                                                                                                     |

No sign-in is needed. The server stores nothing about users; the browser sends the chat history with each request.

## How it works

```
React (Vite)  ──fetch──►  FastAPI  ──►  OpenAI (vision, structured output, embeddings)
                              │
                              └──►  SQLite (recipes + embeddings)  +  scikit-learn models
```

1. **Photo → ingredients:** a vision model returns a structured result (`is_valid_food_photo`, `reason`, `ingredients`). Non-food photos are rejected.
2. **Chat → recipe:** the model returns a structured turn (`reply` + optional `recipe`). It asks at most two short questions, then writes the recipe.
3. **Similar real recipes:** the AI recipe's ingredients are turned into an embedding (`text-embedding-3-small`) and compared with the stored recipe embeddings using cosine similarity. The closest matches are shown, with what you have and what you'd need to buy.
4. **Meal planner and dish reviewer:** each uses its own structured-output schema, so the page always receives clean fields.

## Data and machine learning

- **Data:** the Food.com recipes dataset (from Kaggle), cleaned and loaded into SQLite: 8,761 recipes after removing duplicates, batch-style entries and implausible calorie values.
- **Embeddings:** one 1,536-number vector per recipe, stored as a float32 BLOB and loaded into memory once at start-up. Search is a single matrix multiplication.
- **Cuisine classifier:** TF-IDF + Linear SVC on ingredients. Accuracy about 0.78, macro F1 about 0.70.
- Calorie model: Random Forest, validation MAE 160.6 kcal and R² 0.109 (6,577 training and 1,645 validation recipes). The baseline, which always predicts the median, had MAE 172.2 kcal and R² -0.037. Ridge regression scored MAE 161.5 and R² 0.110. The model beat the baseline by only about 12 kcal, and its biggest misses were high-calorie recipes with few ingredients, such as Wasabi Aioli (932 actual vs 163 predicted). So the app shows the dataset’s own calorie values rather than predictions.
- **Clustering and map:** KMeans + PCA / t-SNE over the recipe vectors. The map data is saved in `backend/models/recipe_map.json`.

## Safety and honesty

- AI recipes, plans and reviews are always labelled as AI-generated and "not tested by cooks".
- Prompts include safe cooking temperatures and a food-safety note.
- Text from users, photos and recipes is treated as **data, not instructions** (prompt-injection defence).
- Inputs are validated: image type and size (max 4 MB), list lengths, message lengths.
- The dish reviewer judges appearance only. It does not claim a dish is cooked through or safe to eat.
- The OpenAI key lives only in `backend/.env`, which is git-ignored.

## API routes

| Method | Route                  | Purpose                                                       |
| ------ | ---------------------- | ------------------------------------------------------------- |
| GET    | `/health`              | Health check                                                  |
| POST   | `/extract-ingredients` | Fridge photo → ingredient list                                |
| POST   | `/search-recipes`      | Ingredients → closest real recipes                            |
| GET    | `/recipes`             | Browse recipes (search, category, time, photo filter, paging) |
| GET    | `/recipes/{id}`        | One recipe with ingredients and steps                         |
| GET    | `/categories`          | Category list for the filter                                  |
| POST   | `/chat`                | AI Recipe Generator turn: reply, recipe, similar recipes      |
| POST   | `/meal-plan`           | AI Meal Planner turn: reply and plan                          |
| POST   | `/review-dish`         | AI Dish Reviewer: photo → scores and feedback                 |

Interactive docs: `http://127.0.0.1:8000/docs`

## Project structure

```
kitchen-assistant/
├── backend/
│   ├── main.py            # FastAPI app and routes
│   ├── chat_agent.py      # AI Recipe Generator
│   ├── meal_planner.py    # AI Meal Planner
│   ├── recipe_search.py   # embedding search, browse, recipe lookup
│   ├── scripts/           # data cleaning, DB build, embeddings, model training
│   ├── requirements.txt
│   └── .env               # OPENAI_API_KEY (not committed)
├── frontend/
│   ├── public/food/       # landing-page photos
│   └── src/
│       ├── App.jsx, App.css
│       ├── api.js, RecipeModal.jsx
│       └── pages/         # Landing, Recipes, Chat, Planner, Reviewer
└── README.md
```

`backend/data`, `backend/db` and `backend/models` are generated locally and are not committed.

## Setup (Windows, PowerShell)

**Backend**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend\.env` with one line (never commit this file):

```
OPENAI_API_KEY=your-key-here
```

Build the database and models by running the scripts in `backend\scripts` (from `backend`, as `python scripts\name.py`): create the database, load the recipes, create and fill the embeddings, add times, images and cuisine tags, and train the models. Then start the API:

```powershell
fastapi dev main.py
```

**Frontend** (in a second terminal)

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Known limitations

- Only about 31% of recipes have a photo (the dataset has none for the rest), so the grid can hide recipes without photos.
- The AI recipe has no photo of its own; the photo shown comes from the closest real recipe.
- The calorie model is weak and is not used in the app.
- Ingredient matching works on whole words and does not fix spelling mistakes.
- The model name is set in `main.py`, `chat_agent.py` and `meal_planner.py`.
- No user accounts, so nothing is saved between visits.

## Credits

- Recipes: Food.com dataset on Kaggle (educational use).
- Landing-page photos: Google Images
