/**
 * Lightweight AI heuristics for item/task suggestions
 * All logic is local - no LLM calls
 */

// Common event items with category mappings
const ITEM_DATABASE: { name: string; category: string; subcategory?: string; dietary?: string[]; countable?: boolean }[] = [
  // Food & Drinks
  { name: "Paper plates", category: "tableware", countable: true },
  { name: "Plastic cups", category: "tableware", countable: true },
  { name: "Napkins", category: "tableware", countable: true },
  { name: "Utensils set", category: "tableware", countable: true },
  { name: "Forks", category: "tableware", countable: true },
  { name: "Knives", category: "tableware", countable: true },
  { name: "Spoons", category: "tableware", countable: true },
  { name: "Serving trays", category: "tableware" },
  { name: "Serving spoons", category: "tableware" },
  
  // Food items with subcategories
  { name: "Chips and dip", category: "food_drinks", subcategory: "appetizers" },
  { name: "Veggie tray", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian", "vegan"] },
  { name: "Cheese platter", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian"] },
  { name: "Fruit platter", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian", "vegan", "gluten_free"] },
  { name: "Hummus", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian", "vegan", "gluten_free"] },
  { name: "Deviled eggs", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian", "gluten_free"] },
  { name: "Bruschetta", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian"] },
  { name: "Spinach dip", category: "food_drinks", subcategory: "appetizers", dietary: ["vegetarian"] },
  { name: "Meatballs", category: "food_drinks", subcategory: "appetizers" },
  { name: "Wings", category: "food_drinks", subcategory: "appetizers", dietary: ["gluten_free"] },
  
  { name: "Pasta salad", category: "food_drinks", subcategory: "sides" },
  { name: "Green salad", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian", "vegan", "gluten_free"] },
  { name: "Coleslaw", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian", "gluten_free"] },
  { name: "Potato salad", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian", "gluten_free"] },
  { name: "Mac and cheese", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian"] },
  { name: "Baked beans", category: "food_drinks", subcategory: "sides" },
  { name: "Cornbread", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian"] },
  { name: "Garlic bread", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian"] },
  { name: "Rice", category: "food_drinks", subcategory: "sides", dietary: ["vegetarian", "vegan", "gluten_free"] },
  
  { name: "Burgers", category: "food_drinks", subcategory: "mains" },
  { name: "Hot dogs", category: "food_drinks", subcategory: "mains" },
  { name: "BBQ chicken", category: "food_drinks", subcategory: "mains", dietary: ["gluten_free"] },
  { name: "Pulled pork", category: "food_drinks", subcategory: "mains", dietary: ["gluten_free"] },
  { name: "Lasagna", category: "food_drinks", subcategory: "mains" },
  { name: "Pizza", category: "food_drinks", subcategory: "mains", dietary: ["vegetarian"] },
  { name: "Tacos", category: "food_drinks", subcategory: "mains" },
  { name: "Grilled vegetables", category: "food_drinks", subcategory: "mains", dietary: ["vegetarian", "vegan", "gluten_free"] },
  
  { name: "Brownies", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian"] },
  { name: "Cookies", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian"] },
  { name: "Cupcakes", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian"] },
  { name: "Cake", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian"] },
  { name: "Pie", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian"] },
  { name: "Ice cream", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian", "gluten_free"] },
  { name: "Fruit salad", category: "food_drinks", subcategory: "desserts", dietary: ["vegetarian", "vegan", "gluten_free"] },
  
  { name: "Soda", category: "food_drinks", subcategory: "drinks", countable: true },
  { name: "Water bottles", category: "food_drinks", subcategory: "drinks", countable: true },
  { name: "Juice", category: "food_drinks", subcategory: "drinks", countable: true },
  { name: "Lemonade", category: "food_drinks", subcategory: "drinks", dietary: ["vegetarian", "vegan", "gluten_free"] },
  { name: "Iced tea", category: "food_drinks", subcategory: "drinks", dietary: ["vegetarian", "vegan", "gluten_free"] },
  { name: "Coffee", category: "food_drinks", subcategory: "drinks", dietary: ["vegetarian", "vegan", "gluten_free"] },
  { name: "Beer", category: "food_drinks", subcategory: "drinks" },
  { name: "Wine", category: "food_drinks", subcategory: "drinks", dietary: ["vegetarian", "gluten_free"] },
  { name: "Cocktail mixers", category: "food_drinks", subcategory: "drinks" },
  { name: "Ice", category: "food_drinks", subcategory: "drinks" },
  { name: "Cooler", category: "equipment" },
  
  // Decor
  { name: "Balloons", category: "decor" },
  { name: "Banner", category: "decor" },
  { name: "Streamers", category: "decor" },
  { name: "Tablecloth", category: "decor" },
  { name: "Centerpieces", category: "decor" },
  { name: "Candles", category: "decor" },
  { name: "String lights", category: "decor" },
  { name: "Photo backdrop", category: "decor" },
  { name: "Table decorations", category: "decor" },
  { name: "Flower arrangements", category: "decor" },
  
  // Equipment
  { name: "Folding table", category: "equipment" },
  { name: "Folding chairs", category: "equipment", countable: true },
  { name: "Portable speaker", category: "equipment" },
  { name: "Projector", category: "equipment" },
  { name: "Tent", category: "equipment" },
  { name: "Grill", category: "equipment" },
  { name: "Extension cord", category: "equipment" },
  { name: "Portable charger", category: "equipment" },
  
  // Activities
  { name: "Board games", category: "activities" },
  { name: "Card games", category: "activities" },
  { name: "Lawn games", category: "activities" },
  { name: "Cornhole", category: "activities" },
  { name: "Frisbee", category: "activities" },
  { name: "Sports equipment", category: "activities" },
  { name: "Karaoke machine", category: "activities" },
  { name: "Photo booth props", category: "activities" },
  
  // Setup & Cleanup
  { name: "Trash bags", category: "setup_cleanup", countable: true },
  { name: "Paper towels", category: "setup_cleanup", countable: true },
  { name: "Cleaning supplies", category: "setup_cleanup" },
  { name: "Hand sanitizer", category: "setup_cleanup" },
  { name: "First aid kit", category: "setup_cleanup" },
];

// Dietary keyword detection
const DIETARY_KEYWORDS: Record<string, string[]> = {
  vegetarian: ["vegetarian", "veggie", "meatless", "plant-based"],
  vegan: ["vegan", "plant-based", "dairy-free", "no animal"],
  gluten_free: ["gluten-free", "gluten free", "gf", "celiac"],
  nut_free: ["nut-free", "nut free", "no nuts", "peanut-free"],
  dairy_free: ["dairy-free", "dairy free", "lactose-free", "no dairy"],
  kosher: ["kosher"],
  halal: ["halal"],
};

// Category keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food_drinks: ["food", "drink", "eat", "snack", "meal", "appetizer", "dessert", "salad", "chicken", "beef", "pasta", "pizza", "burger", "taco", "sandwich", "soda", "water", "juice", "wine", "beer", "coffee"],
  tableware: ["plate", "cup", "napkin", "utensil", "fork", "knife", "spoon", "bowl", "serving", "tray"],
  decor: ["decor", "decoration", "balloon", "banner", "streamer", "tablecloth", "centerpiece", "candle", "light", "flower"],
  equipment: ["table", "chair", "speaker", "projector", "tent", "grill", "cooler", "extension"],
  activities: ["game", "activity", "entertainment", "music", "karaoke", "cornhole", "frisbee", "sport"],
  setup_cleanup: ["trash", "clean", "sanitizer", "towel", "bag", "first aid"],
};

// Subcategory keywords for food
const FOOD_SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  appetizers: ["appetizer", "starter", "dip", "chip", "veggie tray", "cheese", "hummus", "bruschetta", "wing", "meatball"],
  mains: ["main", "entree", "burger", "hot dog", "chicken", "pork", "beef", "lasagna", "pizza", "taco", "steak"],
  sides: ["side", "salad", "pasta salad", "coleslaw", "potato", "mac", "bean", "bread", "rice"],
  desserts: ["dessert", "sweet", "brownie", "cookie", "cupcake", "cake", "pie", "ice cream", "fruit salad"],
  drinks: ["drink", "beverage", "soda", "water", "juice", "lemonade", "tea", "coffee", "beer", "wine", "cocktail", "ice"],
};

export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  confidence: number;
}

export interface DietarySuggestion {
  tag: string;
  confidence: number;
}

export interface NameSuggestion {
  name: string;
  category: string;
  subcategory?: string;
}

export interface QuantitySuggestion {
  suggested: number;
  reason: string;
}

/**
 * Suggest category and subcategory based on item name
 */
export function suggestCategory(itemName: string): CategorySuggestion | null {
  const lowerName = itemName.toLowerCase().trim();
  if (!lowerName) return null;

  // Check database first for exact/partial match
  const dbMatch = ITEM_DATABASE.find(item => 
    lowerName.includes(item.name.toLowerCase()) || 
    item.name.toLowerCase().includes(lowerName)
  );
  
  if (dbMatch) {
    return {
      category: dbMatch.category,
      subcategory: dbMatch.subcategory,
      confidence: 0.9,
    };
  }

  // Keyword matching
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      // Check for food subcategory
      let subcategory: string | undefined;
      if (category === 'food_drinks') {
        for (const [subcat, subKeywords] of Object.entries(FOOD_SUBCATEGORY_KEYWORDS)) {
          if (subKeywords.some(kw => lowerName.includes(kw))) {
            subcategory = subcat;
            break;
          }
        }
      }
      return { category, subcategory, confidence: 0.7 };
    }
  }

  return null;
}

/**
 * Suggest dietary tags based on item name
 */
export function suggestDietaryTags(itemName: string): DietarySuggestion[] {
  const lowerName = itemName.toLowerCase().trim();
  const suggestions: DietarySuggestion[] = [];

  // Check database first
  const dbMatch = ITEM_DATABASE.find(item => 
    lowerName.includes(item.name.toLowerCase()) || 
    item.name.toLowerCase().includes(lowerName)
  );
  
  if (dbMatch?.dietary) {
    return dbMatch.dietary.map(tag => ({ tag, confidence: 0.85 }));
  }

  // Keyword matching
  for (const [tag, keywords] of Object.entries(DIETARY_KEYWORDS)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      suggestions.push({ tag, confidence: 0.8 });
    }
  }

  return suggestions;
}

/**
 * Get name suggestions based on prefix
 */
export function getNameSuggestions(prefix: string, limit: number = 4): NameSuggestion[] {
  const lowerPrefix = prefix.toLowerCase().trim();
  if (lowerPrefix.length < 2) return [];

  return ITEM_DATABASE
    .filter(item => item.name.toLowerCase().includes(lowerPrefix))
    .slice(0, limit)
    .map(item => ({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
    }));
}

/**
 * Suggest quantity based on item type and guest count
 */
export function suggestQuantity(itemName: string, guestCount: number): QuantitySuggestion | null {
  if (!guestCount || guestCount <= 0) return null;

  const lowerName = itemName.toLowerCase().trim();
  
  // Find if this is a countable item
  const dbMatch = ITEM_DATABASE.find(item => 
    lowerName.includes(item.name.toLowerCase()) || 
    item.name.toLowerCase().includes(lowerName)
  );

  // Countable items that should scale with guests
  const countablePatterns = [
    "cup", "plate", "napkin", "fork", "knife", "spoon", "utensil",
    "water bottle", "soda", "drink", "chair", "seat"
  ];

  const isCountable = dbMatch?.countable || countablePatterns.some(p => lowerName.includes(p));

  if (!isCountable) return null;

  // Add 10-15% buffer for countable items
  const buffer = Math.ceil(guestCount * 0.15);
  const suggested = guestCount + buffer;

  return {
    suggested,
    reason: `${guestCount} guests + ${buffer} extra`,
  };
}

/**
 * Get commonly missing essential items
 */
export function getMissingEssentials(existingItems: string[], limit: number = 3): string[] {
  const essentials = [
    "Napkins", "Drinks", "Ice", "Plates", "Cups", "Utensils", 
    "Trash bags", "Paper towels", "Hand sanitizer"
  ];

  const lowerExisting = existingItems.map(i => i.toLowerCase());
  
  return essentials
    .filter(e => !lowerExisting.some(ex => ex.includes(e.toLowerCase())))
    .slice(0, limit);
}

/**
 * Get task suggestions based on item context
 */
export function getTaskSuggestions(categories: string[], itemCount: number): string[] {
  const suggestions: string[] = [];

  if (categories.includes('food_drinks') && itemCount >= 3) {
    suggestions.push("Make a grocery shopping list");
  }
  if (categories.includes('decor')) {
    suggestions.push("Set up decorations day-of");
  }
  if (categories.includes('equipment')) {
    suggestions.push("Pick up/return rental equipment");
  }
  if (categories.includes('activities')) {
    suggestions.push("Test games and activities");
  }
  if (itemCount >= 5) {
    suggestions.push("Confirm all items are covered");
  }

  return suggestions.slice(0, 2);
}

/**
 * Check for similar/duplicate items
 */
export function findSimilarItems(newItemName: string, existingItems: { id: string; name: string }[]): { id: string; name: string } | null {
  const lowerNew = newItemName.toLowerCase().trim();
  if (lowerNew.length < 3) return null;

  // Simple word overlap similarity
  const newWords = lowerNew.split(/\s+/).filter(w => w.length > 2);
  
  for (const existing of existingItems) {
    const existingWords = existing.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const overlap = newWords.filter(w => existingWords.some(ew => ew.includes(w) || w.includes(ew)));
    
    if (overlap.length > 0 && overlap.length >= Math.min(newWords.length, existingWords.length) * 0.5) {
      return existing;
    }
  }

  return null;
}

/**
 * Format category for display
 */
export function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    food_drinks: "Food & Drinks",
    tableware: "Tableware & Serving",
    decor: "Decor",
    activities: "Activities & Entertainment",
    setup_cleanup: "Setup & Cleanup",
    equipment: "Equipment",
    other: "Other",
  };
  return labels[category] || category;
}

/**
 * Format subcategory for display
 */
export function formatSubcategoryLabel(subcategory: string): string {
  const labels: Record<string, string> = {
    appetizers: "Appetizers",
    mains: "Main Dishes",
    sides: "Sides",
    desserts: "Desserts",
    drinks: "Drinks",
  };
  return labels[subcategory] || subcategory;
}
