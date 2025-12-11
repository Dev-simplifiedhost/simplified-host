export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  themeColor: string;
  suggestedItems: Array<{
    name: string;
    category: string;
    quantity: number;
  }>;
  defaultSettings: {
    allowGuestItems: boolean;
    contributionGoal?: string;
    showContributionGoal: boolean;
    dressCode?: string;
    specialRequests?: string;
  };
  sampleDescription: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "friendsgiving",
    name: "Friendsgiving",
    description: "A cozy gathering with friends to celebrate gratitude",
    themeColor: "amber",
    suggestedItems: [
      { name: "Turkey or Main Dish", category: "Food", quantity: 1 },
      { name: "Mashed Potatoes", category: "Food", quantity: 1 },
      { name: "Stuffing", category: "Food", quantity: 1 },
      { name: "Green Bean Casserole", category: "Food", quantity: 1 },
      { name: "Cranberry Sauce", category: "Food", quantity: 1 },
      { name: "Pumpkin Pie", category: "Dessert", quantity: 2 },
      { name: "Apple Pie", category: "Dessert", quantity: 1 },
      { name: "Wine", category: "Drinks", quantity: 2 },
      { name: "Sparkling Cider", category: "Drinks", quantity: 2 },
      { name: "Plates & Utensils", category: "Supplies", quantity: 1 },
      { name: "Napkins", category: "Supplies", quantity: 1 },
    ],
    defaultSettings: {
      allowGuestItems: true,
      contributionGoal: "150",
      showContributionGoal: true,
      dressCode: "Casual",
      specialRequests: "Please bring a dish to share! Feel free to bring friends and family.",
    },
    sampleDescription: "Join us for a cozy Friendsgiving celebration! Bring your favorite dish and let's give thanks together. 🦃🍂",
  },
  {
    id: "bridal-shower",
    name: "Bridal Shower",
    description: "Celebrate the bride-to-be with style and elegance",
    themeColor: "rose",
    suggestedItems: [
      { name: "Champagne", category: "Drinks", quantity: 3 },
      { name: "Mimosa Bar Supplies", category: "Drinks", quantity: 1 },
      { name: "Finger Sandwiches", category: "Food", quantity: 1 },
      { name: "Fruit Platter", category: "Food", quantity: 1 },
      { name: "Cheese Board", category: "Food", quantity: 1 },
      { name: "Cupcakes", category: "Dessert", quantity: 2 },
      { name: "Macarons", category: "Dessert", quantity: 1 },
      { name: "Decorations", category: "Supplies", quantity: 1 },
      { name: "Party Favors", category: "Supplies", quantity: 1 },
      { name: "Games & Activities", category: "Entertainment", quantity: 1 },
    ],
    defaultSettings: {
      allowGuestItems: true,
      contributionGoal: "200",
      showContributionGoal: false,
      dressCode: "Garden Party or Cocktail Attire",
      specialRequests: "Please RSVP with any dietary restrictions. No gifts required - your presence is the best present!",
    },
    sampleDescription: "Let's shower the bride with love! Join us for an elegant afternoon celebrating [Bride's Name]. 💐✨",
  },
  {
    id: "office-party",
    name: "Office Party",
    description: "Team celebration and networking event",
    themeColor: "blue",
    suggestedItems: [
      { name: "Pizza", category: "Food", quantity: 5 },
      { name: "Salad", category: "Food", quantity: 2 },
      { name: "Soda & Water", category: "Drinks", quantity: 2 },
      { name: "Coffee & Tea", category: "Drinks", quantity: 1 },
      { name: "Cookies & Brownies", category: "Dessert", quantity: 2 },
      { name: "Cake", category: "Dessert", quantity: 1 },
      { name: "Plates & Utensils", category: "Supplies", quantity: 1 },
      { name: "Decorations", category: "Supplies", quantity: 1 },
      { name: "Music Playlist", category: "Entertainment", quantity: 1 },
    ],
    defaultSettings: {
      allowGuestItems: false,
      contributionGoal: "300",
      showContributionGoal: false,
      dressCode: "Business Casual",
      specialRequests: "Please RSVP by [date] so we can get an accurate headcount for food.",
    },
    sampleDescription: "Join us for our quarterly team celebration! Let's connect, celebrate our wins, and have some fun together. 🎉",
  },
  {
    id: "birthday",
    name: "Birthday Party",
    description: "Celebrate another trip around the sun!",
    themeColor: "purple",
    suggestedItems: [
      { name: "Birthday Cake", category: "Dessert", quantity: 1 },
      { name: "Ice Cream", category: "Dessert", quantity: 2 },
      { name: "Chips & Dip", category: "Food", quantity: 2 },
      { name: "Veggie Platter", category: "Food", quantity: 1 },
      { name: "Soda & Juice", category: "Drinks", quantity: 3 },
      { name: "Beer & Wine", category: "Drinks", quantity: 2 },
      { name: "Balloons", category: "Decorations", quantity: 1 },
      { name: "Streamers & Banners", category: "Decorations", quantity: 1 },
      { name: "Party Hats", category: "Supplies", quantity: 1 },
      { name: "Music Setup", category: "Entertainment", quantity: 1 },
    ],
    defaultSettings: {
      allowGuestItems: true,
      contributionGoal: "100",
      showContributionGoal: true,
      dressCode: "Casual - Come as you are!",
      specialRequests: "No gifts please! Your presence is all I want. 🎂",
    },
    sampleDescription: "It's my birthday and you're invited! Come celebrate with food, drinks, and good vibes. 🎈🎉",
  },
  {
    id: "holiday-mixer",
    name: "Holiday Mixer",
    description: "Festive gathering to celebrate the season",
    themeColor: "default",
    suggestedItems: [
      { name: "Holiday Cookies", category: "Dessert", quantity: 3 },
      { name: "Hot Cocoa Bar", category: "Drinks", quantity: 1 },
      { name: "Eggnog", category: "Drinks", quantity: 2 },
      { name: "Mulled Wine", category: "Drinks", quantity: 1 },
      { name: "Cheese & Crackers", category: "Food", quantity: 2 },
      { name: "Charcuterie Board", category: "Food", quantity: 1 },
      { name: "Appetizers", category: "Food", quantity: 2 },
      { name: "Holiday Decorations", category: "Decorations", quantity: 1 },
      { name: "String Lights", category: "Decorations", quantity: 1 },
      { name: "Holiday Music Playlist", category: "Entertainment", quantity: 1 },
    ],
    defaultSettings: {
      allowGuestItems: true,
      contributionGoal: "175",
      showContributionGoal: true,
      dressCode: "Festive Attire - Ugly sweaters encouraged!",
      specialRequests: "Feel free to bring a dish or drink to share. White elephant gift exchange ($20 limit) - bring a wrapped gift if you'd like to participate!",
    },
    sampleDescription: "Get in the holiday spirit! Join us for a festive evening of food, drinks, and merriment. 🎄✨",
  },
];

export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find(template => template.id === id);
}
