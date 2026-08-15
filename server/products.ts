export type ProductOption = {
  id: string;
  label: string;
  priceDeltaCents: number;
};

export type PizzaProduct = {
  id: string;
  name: string;
  description: string;
  category: "Pizzas" | "Sides" | "Drinks" | "Desserts";
  basePriceCents: number;
  image: string;
  available: boolean;
  sizes?: ProductOption[];
  crusts?: ProductOption[];
  sauces?: ProductOption[];
  cheeses?: ProductOption[];
  toppings?: ProductOption[];
};

export const catalog: PizzaProduct[] = [
  {
    id: "ember-margherita",
    name: "Ember Margherita",
    description: "San Marzano, fior di latte, basil oil, charred cherry tomato.",
    category: "Pizzas",
    basePriceCents: 1680,
    image: "margherita",
    available: true,
    sizes: [
      { id: "12", label: "12 inch", priceDeltaCents: 0 },
      { id: "16", label: "16 inch", priceDeltaCents: 520 },
    ],
    crusts: [
      { id: "neapolitan", label: "Neapolitan", priceDeltaCents: 0 },
      { id: "sourdough", label: "Sourdough", priceDeltaCents: 180 },
      { id: "gluten-free", label: "Gluten-free", priceDeltaCents: 240 },
    ],
    sauces: [
      { id: "san-marzano", label: "San Marzano", priceDeltaCents: 0 },
      { id: "spicy-arrabbiata", label: "Spicy arrabbiata", priceDeltaCents: 90 },
    ],
    cheeses: [
      { id: "fior-di-latte", label: "Fior di latte", priceDeltaCents: 0 },
      { id: "bufala", label: "Buffalo mozzarella", priceDeltaCents: 250 },
      { id: "plant-based", label: "Plant based", priceDeltaCents: 190 },
    ],
    toppings: [
      { id: "pepperoni", label: "Cupping pepperoni", priceDeltaCents: 240 },
      { id: "mushroom", label: "Roasted mushrooms", priceDeltaCents: 160 },
      { id: "chili", label: "Calabrian chili", priceDeltaCents: 110 },
      { id: "olives", label: "Castelvetrano olives", priceDeltaCents: 130 },
      { id: "basil", label: "Fresh basil", priceDeltaCents: 70 },
    ],
  },
  {
    id: "midnight-pepperoni",
    name: "Midnight Pepperoni",
    description: "Cupping pepperoni, smoked provolone, hot honey, oregano.",
    category: "Pizzas",
    basePriceCents: 1880,
    image: "pepperoni",
    available: true,
    sizes: [
      { id: "12", label: "12 inch", priceDeltaCents: 0 },
      { id: "16", label: "16 inch", priceDeltaCents: 540 },
    ],
    crusts: [
      { id: "neapolitan", label: "Neapolitan", priceDeltaCents: 0 },
      { id: "sourdough", label: "Sourdough", priceDeltaCents: 180 },
      { id: "gluten-free", label: "Gluten-free", priceDeltaCents: 240 },
    ],
    sauces: [
      { id: "san-marzano", label: "San Marzano", priceDeltaCents: 0 },
      { id: "spicy-arrabbiata", label: "Spicy arrabbiata", priceDeltaCents: 90 },
    ],
    cheeses: [
      { id: "fior-di-latte", label: "Fior di latte", priceDeltaCents: 0 },
      { id: "bufala", label: "Buffalo mozzarella", priceDeltaCents: 250 },
      { id: "plant-based", label: "Plant based", priceDeltaCents: 190 },
    ],
    toppings: [
      { id: "pepperoni", label: "Cupping pepperoni", priceDeltaCents: 240 },
      { id: "mushroom", label: "Roasted mushrooms", priceDeltaCents: 160 },
      { id: "chili", label: "Calabrian chili", priceDeltaCents: 110 },
      { id: "olives", label: "Castelvetrano olives", priceDeltaCents: 130 },
      { id: "basil", label: "Fresh basil", priceDeltaCents: 70 },
    ],
  },
  {
    id: "green-room",
    name: "Green Room",
    description: "Wild mushrooms, pistachio pesto, ricotta, lemon zest.",
    category: "Pizzas",
    basePriceCents: 1820,
    image: "green",
    available: true,
    sizes: [
      { id: "12", label: "12 inch", priceDeltaCents: 0 },
      { id: "16", label: "16 inch", priceDeltaCents: 530 },
    ],
    crusts: [
      { id: "neapolitan", label: "Neapolitan", priceDeltaCents: 0 },
      { id: "sourdough", label: "Sourdough", priceDeltaCents: 180 },
      { id: "gluten-free", label: "Gluten-free", priceDeltaCents: 240 },
    ],
    sauces: [
      { id: "san-marzano", label: "San Marzano", priceDeltaCents: 0 },
      { id: "spicy-arrabbiata", label: "Spicy arrabbiata", priceDeltaCents: 90 },
    ],
    cheeses: [
      { id: "fior-di-latte", label: "Fior di latte", priceDeltaCents: 0 },
      { id: "bufala", label: "Buffalo mozzarella", priceDeltaCents: 250 },
      { id: "plant-based", label: "Plant based", priceDeltaCents: 190 },
    ],
    toppings: [
      { id: "pepperoni", label: "Cupping pepperoni", priceDeltaCents: 240 },
      { id: "mushroom", label: "Roasted mushrooms", priceDeltaCents: 160 },
      { id: "chili", label: "Calabrian chili", priceDeltaCents: 110 },
      { id: "olives", label: "Castelvetrano olives", priceDeltaCents: 130 },
      { id: "basil", label: "Fresh basil", priceDeltaCents: 70 },
    ],
  },
  { id: "fire-knots", name: "Fire Knots", description: "Garlic butter, pecorino, fermented chili.", category: "Sides", basePriceCents: 790, image: "knots", available: true },
  { id: "citrus-soda", name: "Citrus Soda", description: "Blood orange, yuzu, sparkling mineral water.", category: "Drinks", basePriceCents: 490, image: "soda", available: true },
  { id: "burnt-basque", name: "Burnt Basque", description: "Caramelized cheesecake, sea salt, orange oil.", category: "Desserts", basePriceCents: 860, image: "dessert", available: false },
];

export const catalogById = new Map(catalog.map(product => [product.id, product]));
