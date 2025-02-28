import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: (recipe | ingredient)[] = [];

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  // TODO: implement me
  let retString = recipeName.replace(/[-_]/g, ' ');
  retString = retString.replace(/[^a-zA-Z\s]/g, '');
  retString = retString.toLowerCase();
  if (retString.length === 0) {
    return null;
  }
  const wordsArray = retString.split(/\s+/);
  for (let i = 0; i < wordsArray.length; i++) {
    wordsArray[i] = wordsArray[i][0].toUpperCase() + wordsArray[i].slice(1);
  }
  retString = wordsArray.join(' ');

  return wordsArray.join(' ');
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req:Request, res:Response) => {
  // TODO: implement me
  const entry = req.body;
  if (entry.type !== 'recipe' && entry.type !== 'ingredient') {
    return res.status(400).json({ error: 'Invalid type' });
  } 

  if (cookbook.map(item => item.name).includes(entry.name)) {
    return res.status(400).json({ error: 'entry with that name already exists' });
  }

  if (entry.type == "recipe") {
    return addRecipe(entry, res);
  } else if (entry.type == "ingredient") {
    return addIngredient(entry, res);
  }
});

// Task 2 Helpers
const addRecipe = (entry: recipe, res: Response) => {
  const requiredItems = new Set();
  for (const item of entry.requiredItems) {
    if (requiredItems.has(item.name)) {
      return res.status(400).json({ error: 'more than one element per name in requiredItems' });
    } else {
      requiredItems.add(item.name);
    }
  }

  const newRecipe: recipe = { 
    type: entry.type, 
    name: entry.name,
    requiredItems: entry.requiredItems,
  };

  cookbook.push(newRecipe);
  return res.status(200).json({});
}

const addIngredient = (entry: ingredient, res: Response) => {
  if (entry.cookTime < 0) {
    return res.status(400).json({ error: 'Invalid cookTime' });
  }

  const newIngredient: ingredient = {
    type: entry.type,
    name: entry.name,
    cookTime: entry.cookTime,
  };

  cookbook.push(newIngredient);
  return res.status(200).json({});
}

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req:Request, res:Request) => {
  // TODO: implement me
  const targetRecipeName = req.query.name as string;

  const recipeIndex = cookbook.findIndex(recipe => recipe.name === targetRecipeName);
  if (recipeIndex === -1) {
    return res.status(400).json({ error: 'recipe with given name not found' });
  }

  if (cookbook[recipeIndex].type === 'ingredient') {
    return res.status(400).json({ error: 'searched name is not name of recipe' });
  }

  // for bfs, treating recipes as parent nodes and their requiredItems as child nodes -> leaf nodes are basically ingredients 
  let totalCookTime = 0;
  const ingredientMap = new Map();
  const queue = [];
  queue.push(cookbook[recipeIndex].name);
  
  while (queue.length !== 0) {
    let tempName = queue.shift();
    const tempIndex = cookbook.findIndex(entry => entry.name === tempName);

    if (tempIndex === -1) {
      return res.status(400).json({ error: 'recipe contains recipe/ingredient not in cookbook' });
    }

    if (cookbook[tempIndex].type === 'ingredient') {
      const currIngredient = cookbook[tempIndex] as ingredient;
      totalCookTime += currIngredient.cookTime;
      if (ingredientMap.has(cookbook[tempIndex].name)) {
        ingredientMap.set(currIngredient.name, 1 + ingredientMap.get(currIngredient.name));
      } else {
        ingredientMap.set(cookbook[tempIndex].name, 1);
      }
    }

    if (cookbook[tempIndex].type === 'recipe') {
      let currRecipe = cookbook[tempIndex] as recipe;
      
      for (const requiredItem of currRecipe.requiredItems) {
        for (let i = 0; i < requiredItem.quantity; i++) {
          queue.push(requiredItem.name);
        }
      }
    }

  }
  
  const ingredientsList = []
  for (const [itemName, numItem] of ingredientMap) {
    ingredientsList.push({ 
      name: itemName,
      quantity: numItem,
    });
  }

  const recipeSummary = {
    name: targetRecipeName,
    cookTime: totalCookTime,
    ingredients: ingredientsList,
  };

  return res.status(200).json(recipeSummary);
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
