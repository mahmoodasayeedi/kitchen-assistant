
pairs = [
    ("oil", "boiled eggs"),
    ("pea", "peanut butter"),
    ("rice", "rice vinegar"),
]

for have, ingredient in pairs:
    loose = have in ingredient
    whole_word = have in ingredient.split()
    print(f"'{have}' vs '{ingredient}' -> loose: {loose}, whole word: {whole_word}")