# AI Kitchen Assistant 🍳

Turn the ingredients you already have into dinner. Upload a photo of your fridge, or type or say what you feel like cooking, and the app creates a recipe, plans your meals, builds a shopping list, paints a picture of the dish, and reviews the dish you cooked. Real recipes written by real cooks are shown next to the AI's suggestions.

> **Idea in one line:** AI creates, real recipes validate.

Built for the Ironhack AI Engineering bootcamp with **React (Vite)**, **FastAPI**, **scikit-learn**, **SQLite** and the **OpenAI API**.

Created by Mahmooda Sayeedi, who also cooks and films the recipes on the **My Recipes** tab (YouTube channel: Nahida's Zaika).

## Live demo

- **App:** https://ai-kitchen-assistant-two.vercel.app
- **API docs:** https://ai-kitchen-assistant-api.vercel.app/docs

The first request after a quiet period can take a few seconds while the server wakes up.

---

## Features

| Tab                     | What it does                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **All recipes**         | Browse 8,761 real recipes with photos. Search by name, filter by category and cooking time, open any recipe for the full ingredients and steps.                                                                                                     |
| **AI Recipe Generator** | Chat with the assistant. Upload a fridge photo (ingredients are read by a vision model and are editable), type an idea, or **speak it with the 🎤 button**. The assistant asks short questions, then writes a recipe. Similar real recipes from the database are shown below it. Each recipe also gets an **AI-generated picture** of the dish (about 10 seconds, labelled as AI-generated). |
| **AI Meal Planner**     | Type or speak (🎤) how many days (1–7) and which meals (breakfast, lunch, dinner). The assistant builds a plan shown as day cards, and you can ask it to change the plan. Printable. **Shopping list:** one click merges the plan's ingredients, adds up duplicates, groups them by aisle (Produce, Dairy, Pantry...) and gives a checklist you can tick off. |
| **AI Dish Reviewer**    | Upload a photo of the dish you cooked. Get an overall score, five sub-scores, strengths, improvements and tips.                                                                                                                                     |

Two more things sit outside the four AI/recipe tabs:

- **My Recipes** (sidebar, "My Kitchen" group): the author's own recipe videos from YouTube. Each card shows the video thumbnail and plays the video inside the app, with a link to open it on YouTube and a link to the channel. The list is a small data file (`frontend/src/videos.js`), so adding a video is one new line.
- **Landing page:** the author's channel avatar and name (Nahida's Zaika) sit beside the "From Fridge to Fabulous!" heading and link to the channel. Visitors can type **what to call them**; the name is shown as a greeting on every page and in the sidebar, in a handwriting font.

No sign-in is needed. The server stores nothing about users; the browser sends the chat history with each request. The visitor's name is saved only in the browser (localStorage) and is never sent to the server. The assistant answers in any language if you ask for one (for example "give me this recipe in Spanish"); the interface itself is in English.

## How it works

```
React (Vite)  ──fetch──►  FastAPI  ──►  OpenAI (vision, structured output, embeddings)
                              │
                              └──►  SQLite (recipes + embeddings)  +  scikit-learn models
```

1. **Photo → ingredients:** a vision model returns a structured result (`is_valid_food_photo`, `reason`, `ingredients`). Non-food photos are rejected.
2. **Chat → recipe:** the model returns a structured turn (`reply` + optional `recipe`). It asks at most two short questions, then writes the recipe.
3. **Similar real recipes:** the AI recipe's ingredients are turned into an embedding (`text-embedding-3-small`) and compared with the stored recipe embeddings using cosine similarity. The closest matches are shown, with what you have and what you'd need to buy.
4. **Meal planner, shopping list and dish reviewer:** each uses its own structured-output schema, so the page always receives clean fields. The shopping list is a separate call: the plan's meals go in, and one merged list grouped by aisle comes back.
5. **Voice input:** the 🎤 button in the Recipe Generator and Meal Planner uses the browser's built-in speech recognition (Web Speech API). The recognised words are put into the message box, not sent automatically, so you can fix mistakes first. After that they follow exactly the same path as typed text. The shared logic lives in one React hook, `frontend/src/useVoice.js`.
6. **Recipe picture:** as soon as the assistant returns a recipe, the page sends its title and up to 12 ingredient names to `POST /recipe-image`. The backend builds a short food-photography prompt (overhead shot, natural light, "no text, letters, logos or watermarks"), calls the OpenAI image model at 1024x1024 and low quality, and returns the image as a base64 data URL. Nothing is saved on the server (Vercel's filesystem is read-only). The page caches the picture per recipe title, so the same recipe is never generated twice, and shows a shimmering placeholder while it waits. If generation fails, a **Generate picture** button lets the user retry.

## Data and machine learning

- **Data:** the Food.com recipes dataset (from Kaggle), cleaned and loaded into SQLite: 8,761 recipes after removing duplicates, batch-style entries and implausible calorie values.
- **Embeddings:** one 1,536-number vector per recipe, stored as a float32 BLOB and loaded into memory once at start-up. Search is a single matrix multiplication.
- **Cuisine classifier:** TF-IDF + Linear SVC on ingredients. Accuracy about 0.78, macro F1 about 0.70.
- **Calorie model:** Random Forest, validation MAE 160.6 kcal and R² 0.109 (6,577 training and 1,645 validation recipes). The baseline, which always predicts the median, had MAE 172.2 kcal and R² -0.037. Ridge regression scored MAE 161.5 and R² 0.110. The model beat the baseline by only about 12 kcal, and its biggest misses were high-calorie recipes with few ingredients, such as Wasabi Aioli (932 actual vs 163 predicted). So the app shows the dataset's own calorie values rather than predictions.
- **Clustering and map:** KMeans + PCA / t-SNE over the recipe vectors. The map data is saved in `backend/models/recipe_map.json`.

## Safety and honesty

- AI recipes, plans and reviews are always labelled as AI-generated and "not tested by cooks".
- Prompts include safe cooking temperatures and a food-safety note.
- Text from users, photos and recipes is treated as **data, not instructions** (prompt-injection defence).
- Inputs are validated: image type and size (max 4 MB), list lengths, message lengths.
- The dish reviewer judges appearance only. It does not claim a dish is cooked through or safe to eat.
- Shopping-list quantities are estimates for one serving per meal, so check amounts before shopping.
- Spoken text is treated like typed text: it lands in the message box first, and it goes through the same validation and prompt-injection defence. The backend never receives audio.
- Recipe pictures are labelled "AI-generated image of the dish, not a photo of a real one". The image prompt is built from a length-limited title and ingredient list, forbids text and logos, and is generated only for a recipe the assistant has just written.
- The OpenAI key lives only in `backend/.env` (git-ignored) on a local machine. On Vercel it is set as an environment variable and is never committed.

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
| POST   | `/shopping-list`       | Plan's meals → merged shopping list grouped by aisle          |
| POST   | `/recipe-image`        | Recipe title + ingredients → AI-generated picture (data URL)  |
| POST   | `/review-dish`         | AI Dish Reviewer: photo → scores and feedback                 |

Interactive docs: `http://127.0.0.1:8000/docs`

## Project structure

```
kitchen-assistant/
├── backend/
│   ├── main.py               # FastAPI app and routes
│   ├── chat_agent.py         # AI Recipe Generator
│   ├── meal_planner.py       # AI Meal Planner
│   ├── shopping.py           # Shopping list from a meal plan
│   ├── recipe_image.py       # AI picture of a recipe
│   ├── recipe_search.py      # embedding search, browse, recipe lookup
│   ├── db/kitchen.db         # recipes + embeddings (committed for deployment)
│   ├── scripts/              # data cleaning, DB build, embeddings, model training
│   ├── requirements.txt      # runtime packages (what Vercel installs)
│   ├── requirements-dev.txt  # runtime + local tools (training, dev server)
│   ├── vercel.json           # function settings for Vercel
│   └── .env                  # OPENAI_API_KEY, local only (not committed)
├── frontend/
│   ├── public/               # food/ landing-page photos, channel.png (channel avatar)
│   └── src/
│       ├── App.jsx, App.css
│       ├── api.js, useVoice.js, videos.js, RecipeModal.jsx, CreatorAvatar.jsx
│       └── pages/            # Landing, Recipes, Chat, Planner, Reviewer, Channel
└── README.md
```

`backend/data` and `backend/models` are generated locally and are not committed. `backend/db/kitchen.db` is committed so the deployed backend can read it.

## Setup (Windows, PowerShell)

**Backend**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
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

## Deployment

The app runs as two Vercel projects connected to the same GitHub repository:

| Project  | Root directory | Environment variables                          |
| -------- | -------------- | ---------------------------------------------- |
| Backend  | `backend`      | `OPENAI_API_KEY`, `FRONTEND_ORIGINS`           |
| Frontend | `frontend`     | `VITE_API_URL` (the backend's URL)             |

- `FRONTEND_ORIGINS` is the frontend's URL, so the browser is allowed to call the backend (CORS).
- `VITE_API_URL` is read when the frontend is built, so changing it needs a redeploy.
- Vercel installs `backend/requirements.txt`; `backend/vercel.json` includes the database file and sets the function time limit.
- Vercel limits request bodies to 4.5 MB, which is why image uploads are capped at 4 MB. Generated pictures are requested at 1024x1024 and low quality (about 2.5 MB as base64) to stay under the response limit; one takes about 10 seconds, well inside the 60-second function limit.

## Known limitations

- Only about 31% of recipes have a photo (the dataset has none for the rest), so the grid can hide recipes without photos.
- AI recipe pictures are illustrations made by an image model, not photos of the real dish. Each one takes about 10 seconds and costs a small amount, so set a spending limit on the API key.
- The interface is in English only. The assistant answers in any language on request, but the 8,761 database recipes stay in English.
- The calorie model is weak and is not used in the app.
- Ingredient matching works on whole words and does not fix spelling mistakes.
- The model names are set in `main.py`, `chat_agent.py`, `meal_planner.py` and `shopping.py` (text and vision), and in `recipe_image.py` (image model).
- Shopping-list amounts are estimates, because meal plans do not include quantities.
- Voice input works in Chrome and Edge (not Firefox), needs microphone permission, and is set to English. The browser's speech service does the recognition, so it needs an internet connection.
- No user accounts, so nothing is saved between visits.

## Credits

- Recipes: Food.com dataset on Kaggle (educational use).
- My Recipes videos, the channel avatar and the recipes in them: created by the author (YouTube channel Nahida's Zaika). Video thumbnails are served by YouTube.
- Landing-page photos: found via Google Images; copyright remains with the original owners; used for educational demonstration only.
