from dataclasses import dataclass
from typing import List, Dict, Union
from flask import Flask, request, jsonify
import re

# ==== Type Definitions, feel free to add or modify ===========================
@dataclass
class CookbookEntry:
    name: str
    type: str

@dataclass
class RequiredItem():
    name: str
    quantity: int

@dataclass
class Recipe(CookbookEntry):
    required_items: List[RequiredItem]

@dataclass
class Ingredient(CookbookEntry):
    cook_time: int


# =============================================================================
# ==== HTTP Endpoint Stubs ====================================================
# =============================================================================
app = Flask(__name__)

# Store your recipes here!
cookbook: List[Union[Recipe, Ingredient]] = []

# Task 1 helper (don't touch)
@app.route("/parse", methods=['POST'])
def parse():
    data = request.get_json()
    recipe_name = data.get('input', '')
    parsed_name = parse_handwriting(recipe_name)
    if parsed_name is None:
        return 'Invalid recipe name', 400
    return jsonify({'msg': parsed_name}), 200

# [TASK 1] ====================================================================
# Takes in a recipeName and returns it in a form that 
def parse_handwriting(recipeName: str) -> Union[str | None]:
    # TODO: implement me
    ret_string = re.sub(r'[-_]', ' ', recipeName.lower())
    ret_string = re.sub(r'[^a-zA-Z\s]', '', ret_string)
    
    if len(ret_string) == 0:
        return None

    words_array = ret_string.split()

    return " ".join(words_array).title()

# [TASK 2] ====================================================================
# Endpoint that adds a CookbookEntry to your magical cookbook
@app.route('/entry', methods=['POST'])
def create_entry():
    # TODO: implement me
    entry = None
    dict_entry = request.get_json()
    
    for item in cookbook:
        if item.name == dict_entry['name']:
            return jsonify({ "error": 'entry with that name already exists' }), 400
    
    if dict_entry['type'] == 'recipe':
        required_items = []
        for required_item in dict_entry['requiredItems']:
            required_items.append(RequiredItem(
                name = required_item['name'],
                quantity = required_item['quantity']
            ))
        entry = Recipe(
            name = dict_entry['name'],
            type = dict_entry['type'],
            required_items = required_items,
        )
    elif dict_entry['type'] == 'ingredient':
        entry = Ingredient(
            name = dict_entry['name'],
            type = dict_entry['type'],
            cook_time = dict_entry['cookTime'],
        )
    else:
        return jsonify({ "error": 'Invalid type' }), 400

    

    if entry.type == 'recipe':
        return add_recipe(entry)
    elif entry.type == 'ingredient':
        return add_ingredient(entry)

# task 2 helpers
def add_recipe(entry):
    required_items_set = set()
    for item in entry.required_items:
        if item.name in required_items_set:
            return jsonify({ "error": 'more than one element per name in requiredItems' }), 400
        else:
            required_items_set.add(item.name)

    cookbook.append(entry)
    return jsonify({}), 200

def add_ingredient(entry):
    if entry.cook_time < 0:
        return jsonify({ "error": 'Invalid cooktime' }), 400

    cookbook.append(entry)
    return jsonify({}), 200


# [TASK 3] ====================================================================
# Endpoint that returns a summary of a recipe that corresponds to a query name
@app.route('/summary', methods=['GET'])
def summary():
    target_recipe_name = request.args.get('name')

    recipe_names = [entry.name for entry in cookbook]
    
    if target_recipe_name not in recipe_names:
        return jsonify({ "error": 'recipe with given name not found' }), 400
    recipe_index = recipe_names.index(target_recipe_name)

    if cookbook[recipe_index].type == 'ingredient':
        return jsonify({ "error": 'searched name is not name of recipe' }), 400
    
    total_cook_time = 0
    ingredient_dict = {}
    queue = []
    queue.append(cookbook[recipe_index].name)

    while len(queue) != 0:
        temp_name = queue.pop(0)
        if temp_name not in recipe_names:
            return jsonify({ "error": 'recipe contains recipe/ingredient not in cookbook' + temp_name }), 400

        temp_index = recipe_names.index(temp_name)

        if cookbook[temp_index].type == 'ingredient':
            curr_ingredient = cookbook[temp_index]
            total_cook_time += curr_ingredient.cook_time
            ingredient_dict[curr_ingredient.name] = 1 + ingredient_dict.get(curr_ingredient.name, 0)
        
        if cookbook[temp_index].type == 'recipe':
            curr_recipe = cookbook[temp_index]

            for required_item in curr_recipe.required_items:
                for i in range(required_item.quantity):
                    queue.append(required_item.name)

    ingredients_list = []
    for item_name, num_item in ingredient_dict.items():
        ingredients_list.append({
            "name": item_name,
            "quantity": num_item
        })
    
    recipeSummary = {
        "name": target_recipe_name,
        "cookTime": total_cook_time,
        "ingredients": ingredients_list
    }

    return jsonify(recipeSummary), 200


# =============================================================================
# ==== DO NOT TOUCH ===========================================================
# =============================================================================

if __name__ == '__main__':
    app.run(debug=True, port=8080)
