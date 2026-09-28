// CampCraft game content. Everything the world is built from lives here.

export const ITEMS = {
  tent:         { n: 'Tent', e: '⛺', price: 50, sp: 4, wt: 3, fn: '🏕️', tip: 'Your shelter from wind and rain.' },
  sleeping_bag: { n: 'Sleeping Bag', e: '🛌', price: 30, sp: 3, wt: 2, fn: '😴🌡️', tip: 'Keeps you warm at night.' },
  ground_tarp:  { n: 'Ground Tarp', e: '🟫', price: 12, sp: 1, wt: 1, fn: '💧🚫', tip: 'Keeps the tent floor dry.' },
  rain_fly:     { n: 'Rain Fly', e: '🌂', price: 15, sp: 1, wt: 1, fn: '🌧️🛡️', tip: 'Covers the tent when it rains.' },
  water_bottle: { n: 'Water Bottle', e: '🥤', price: 8, sp: 1, wt: 1, fn: '💧💧', tip: 'Each bottle holds two drinks.' },
  water_filter: { n: 'Water Filter', e: '🚰', price: 35, sp: 1, wt: 1, fn: '💧✅', tip: 'Cleans lake and stream water fast.' },
  tablets:      { n: 'Water Tablets', e: '💊', price: 8, sp: 1, wt: 0, fn: '💧⏳✅', uses: 4, consumable: true, tip: 'Drop in, wait, then drink.' },
  food:         { n: 'Camp Food', e: '🥫', price: 25, sp: 2, wt: 2, fn: '🍗×4', consumable: true, tip: 'Four meals to cook.' },
  snacks:       { n: 'Snacks', e: '🍫', price: 5, sp: 1, wt: 0, fn: '🍗⚡', uses: 3, consumable: true, tip: 'Quick energy, no cooking.' },
  marshmallows: { n: 'Marshmallows', e: '🍡', price: 4, sp: 1, wt: 0, fn: '😊', uses: 3, consumable: true, tip: 'Toast them over the coals!' },
  firewood:     { n: 'Firewood', e: '🪵', price: 6, sp: 2, wt: 3, fn: '🔥', consumable: true, tip: 'Dry wood for a campfire.' },
  flashlight:   { n: 'Flashlight', e: '🔦', price: 15, sp: 1, wt: 0, fn: '🌙👀', tip: 'See in the dark.' },
  lantern:      { n: 'Lantern', e: '🏮', price: 20, sp: 1, wt: 1, fn: '🌙😊', tip: 'Lights up your whole camp.' },
  first_aid:    { n: 'First-Aid Kit', e: '🩹', price: 20, sp: 1, wt: 1, fn: '❤️', tip: 'Bandages for small hurts.' },
  fishing_rod:  { n: 'Fishing Rod', e: '🎣', price: 30, sp: 2, wt: 1, fn: '🐟', tip: 'Catch fish at lakes and rivers.' },
  compass:      { n: 'Compass', e: '🧭', price: 12, sp: 1, wt: 0, fn: '⬆️N', tip: 'The red needle points north.' },
  map:          { n: 'Trail Map', e: '🗺️', price: 5, sp: 1, wt: 0, fn: '📍', tip: 'Shows the trails and places.' },
  rain_jacket:  { n: 'Rain Jacket', e: '☔', price: 25, sp: 1, wt: 1, wear: 1, dry: true, fn: '🌧️👕', tip: 'Keeps you dry in the rain.' },
  hoodie:       { n: 'Hoodie', e: '🧶', price: 15, sp: 1, wt: 1, wear: 2, fn: '🌡️+', tip: 'A cozy warm layer.' },
  warm_jacket:  { n: 'Warm Jacket', e: '🧥', price: 35, sp: 2, wt: 1, wear: 3, fn: '🌡️++', tip: 'Very warm for cold nights.' },
  hat:          { n: 'Hat', e: '🧢', price: 8, sp: 1, wt: 0, wear: 1, sun: true, fn: '☀️🛡️', tip: 'Shades your face from sun.' },
  warm_socks:   { n: 'Warm Socks', e: '🧦', price: 6, sp: 1, wt: 0, wear: 1, fn: '🌡️+', tip: 'Warm feet, warm camper.' },
  rope:         { n: 'Rope', e: '🪢', price: 10, sp: 1, wt: 1, fn: '🛠️', tip: 'For building and hanging food.' },
  cook_kit:     { n: 'Cook Kit', e: '🍳', price: 20, sp: 2, wt: 1, fn: '🍳🔥', tip: 'A pot and pan for cooking.' },
  fire_starter: { n: 'Fire Starter', e: '🔥', price: 6, sp: 1, wt: 0, fn: '🔥', tip: 'Lights tinder to start a fire.' },
  hatchet:      { n: 'Hatchet', e: '🪓', price: 25, sp: 1, wt: 1, fn: '🪵➡️🥢', tip: 'Splits logs into kindling.' },
  bug_spray:    { n: 'Bug Spray', e: '🧴', price: 7, sp: 1, wt: 0, fn: '🦟🚫', tip: 'Keeps mosquitoes away.' },
  book:         { n: 'Book', e: '📘', price: 10, sp: 1, wt: 1, fn: '😊', lux: true, tip: 'Fun to read by the fire.' },
  camera:       { n: 'Camera', e: '📷', price: 30, sp: 1, wt: 1, fn: '📸', lux: true, tip: 'Snap photos of wildlife.' },
  camp_chair:   { n: 'Camp Chair', e: '🪑', price: 40, sp: 3, wt: 2, fn: '😊⚡', lux: true, tip: 'Comfy, but big and heavy.' },
};

export const PACK_CELLS = 16;
export const PACK_WEIGHT = 14;

export const START_OWNED = { tent: 1, sleeping_bag: 1, flashlight: 1, water_bottle: 2, snacks: 2, food: 1, hoodie: 1, map: 1 };
export const START_MONEY = 150;

// Meals that come out of a Camp Food pack
export const FOODS = {
  hotdog:     { n: 'Hot Dog', e: '🌭', rate: 1.2, sides: 1, fill: 30, pot: false },
  beans:      { n: 'Beans', e: '🥣', rate: 0.9, sides: 1, fill: 30, pot: true },
  eggs:       { n: 'Eggs', e: '🍳', rate: 1.3, sides: 1, fill: 25, pot: true },
  pancakes:   { n: 'Pancakes', e: '🥞', rate: 1.1, sides: 2, fill: 30, pot: true },
  corn:       { n: 'Corn', e: '🌽', rate: 0.8, sides: 2, fill: 20, pot: false },
  potato:     { n: 'Potato', e: '🥔', rate: 0.6, sides: 2, fill: 30, pot: false },
  soup:       { n: 'Soup', e: '🍲', rate: 1.0, sides: 1, fill: 30, pot: true },
  marshmallow:{ n: 'Marshmallow', e: '🍡', rate: 1.8, sides: 2, fill: 5, pot: false, treat: true },
  fish:       { n: 'Fish', e: '🐟', rate: 1.0, sides: 2, fill: 40, pot: false },
};
export const MEAL_POOL = ['hotdog', 'beans', 'eggs', 'pancakes', 'corn', 'potato', 'soup'];

export const WEATHER = {
  sun:   { e: '☀️', ne: '🌙', n: 'Sunny', rain: 0, wind: 0 },
  cloud: { e: '⛅', ne: '☁️', n: 'Cloudy', rain: 0, wind: 0 },
  rain:  { e: '🌧️', ne: '🌧️', n: 'Rain', rain: 1, wind: 0.5 },
  wind:  { e: '💨', ne: '💨', n: 'Windy', rain: 0, wind: 2 },
  storm: { e: '⛈️', ne: '⛈️', n: 'Storm', rain: 2, wind: 2.5 },
};

// Tent site types. What you see is the clue.
export const SITES = {
  ideal:   { flat: true, drain: true, hazard: false, wind: 0, bugs: 0, lesson: 'Flat, high, dry ground makes a great tent site.' },
  hollow:  { flat: true, drain: false, hazard: false, wind: 0, bugs: 0, lesson: 'Low ground collects rainwater.' },
  slope:   { flat: false, drain: true, hazard: false, wind: 0, bugs: 0, lesson: 'On a slope you slide downhill all night.' },
  shore:   { flat: true, drain: false, hazard: false, wind: 0, bugs: 2, flood: true, lesson: 'Right by water means bugs and flood risk.' },
  snag:    { flat: true, drain: true, hazard: true, wind: 0, bugs: 0, lesson: 'Never camp under dead branches.' },
  rocky:   { flat: false, drain: true, hazard: false, wind: 0, bugs: 0, lumpy: true, lesson: 'Roots and rocks make a lumpy bed.' },
  exposed: { flat: true, drain: true, hazard: false, wind: 2, bugs: 0, lesson: 'Open ridges get hit hard by wind.' },
};

export const BIOMES = {
  backyard: {
    grass: ['#8fd16a', '#5ea847'], far: ['#9cc6a4', '#7fae8e'], trees: 'oak', density: 0.5,
    house: true, fence: true, faucet: true, sites: ['ideal', 'hollow', 'slope', 'rocky'],
  },
  forest: {
    grass: ['#7cc062', '#4f9a44'], far: ['#8fb7c9', '#6a95a8', '#4f7f6a'], trees: 'mixed', density: 0.8,
    faucet: true, bearbox: true, trashcan: true, table: true, sites: ['ideal', 'hollow', 'snag', 'slope'],
  },
  lake: {
    grass: ['#86c867', '#56a14a'], far: ['#9bc2d9', '#79a3bd', '#5d8c7a'], trees: 'pine', density: 0.7,
    lake: { cx: 1400, cy: 440, rx: 330, ry: 85 }, dock: true, table: true, sites: ['ideal', 'hollow', 'rocky', 'shore'],
  },
  deepforest: {
    grass: ['#6aa857', '#3f8440'], far: ['#86aab8', '#5e8699', '#3d6b55'], trees: 'pine', density: 1.3,
    stream: true, sites: ['ideal', 'hollow', 'snag', 'rocky'],
  },
  mountain: {
    grass: ['#9cbf73', '#6d9a55'], far: ['#b9cde0', '#8fa9c4', '#6f8aa8'], trees: 'pine', density: 0.5, peaks: true, snow: true,
    sites: ['ideal', 'exposed', 'slope', 'rocky'],
  },
  river: {
    grass: ['#84c464', '#529c48'], far: ['#98c0d6', '#739fb8', '#577f6c'], trees: 'mixed', density: 0.8,
    river: true, sites: ['ideal', 'shore', 'hollow', 'snag'],
  },
  wild: {
    grass: ['#89bf66', '#4d8d44'], far: ['#adc6db', '#83a2bd', '#5f7d96'], trees: 'pine', density: 1.0, peaks: true,
    lake: { cx: 1420, cy: 445, rx: 310, ry: 80 }, sites: ['ideal', 'shore', 'snag', 'exposed'],
  },
};

// Explore graph nodes: gx/gy grid coordinates (north is up / -y).
const N = (id, kind, e, n, gx, gy, extra = {}) => ({ id, kind, e, n, gx, gy, ...extra });

export const TRIPS = [
  {
    id: 'backyard', n: 'Backyard Camp', e: '🏡', stage: 1, diff: 1, days: 1, biome: 'backyard', store: false,
    water: 'faucet', fish: false, mapPos: [0.14, 0.72],
    temps: [74, 66, 60], wx: { day: { sun: 6, cloud: 2 }, eve: { sun: 5, cloud: 2 }, night: { sun: 6, cloud: 2 } },
    wildlife: ['squirrel', 'songbird', 'rabbit', 'butterfly', 'firefly', 'owl', 'ladybug', 'snail', 'bee'],
    plants: ['oak', 'clover', 'wildflower', 'sunflower'],
    goals: ['tent_up', 'bag_in_tent', 'pack_flashlight', 'sleep_night'],
    learn: ['🎒', '⛺', '🔦', '😴'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('garden', 'meadow', '🌻', 'Garden', 1, 0), N('bigoak', 'grove', '🌳', 'Big Oak', 0, -1)],
    edges: [['camp', 'garden'], ['camp', 'bigoak']],
  },
  {
    id: 'campground', n: 'Pine Grove Campground', e: '🏕️', stage: 2, diff: 1, days: 2, biome: 'forest', store: true,
    water: 'faucet', fish: false, mapPos: [0.3, 0.55],
    temps: [72, 64, 56], wx: { day: { sun: 5, cloud: 3, rain: 1 }, eve: { sun: 4, cloud: 3, rain: 1 }, night: { sun: 5, cloud: 2, rain: 1 } },
    script: { 1: { night: 'rain', eve: 'cloud' } },
    wildlife: ['squirrel', 'songbird', 'raccoon', 'deer', 'owl', 'rabbit', 'woodpecker', 'bat', 'firefly'],
    plants: ['pine', 'oak', 'fern', 'mushroom', 'wildflower'],
    goals: ['build_fire', 'cook_meal', 'rainfly', 'clean_site', 'fire_safe'],
    learn: ['🔥', '🍳', '🌧️', '🗑️'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('ranger', 'ranger', '🛖', 'Ranger Station', -1, 0), N('trail', 'grove', '🌲', 'Pine Trail', 0, -1),
      N('meadow', 'meadow', '🌼', 'Sunny Meadow', 1, -1)],
    edges: [['camp', 'ranger'], ['camp', 'trail'], ['trail', 'meadow']],
  },
  {
    id: 'lake', n: 'Pine Lake', e: '🎣', stage: 3, diff: 2, days: 2, biome: 'lake', store: true,
    water: 'lake', fish: true, mapPos: [0.47, 0.7],
    temps: [76, 66, 58], wx: { day: { sun: 5, cloud: 3, rain: 1 }, eve: { sun: 3, cloud: 3, rain: 2 }, night: { sun: 4, cloud: 2, rain: 2 } },
    wildlife: ['frog', 'duck', 'turtle', 'raccoon', 'deer', 'songbird', 'owl', 'beaver', 'firefly', 'bat'],
    plants: ['pine', 'fern', 'wildflower', 'berries', 'clover'],
    fishPool: ['bluegill', 'bass', 'catfish', 'crappie'],
    goals: ['catch_fish', 'cook_fish', 'treat_water', 'secure_food'],
    learn: ['🎣', '💧', '🦝', '🍳'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('dock', 'dock', '🛶', 'Fishing Dock', 1, 0), N('reeds', 'lake', '🐸', 'Frog Cove', 1, -1),
      N('meadow', 'meadow', '🌼', 'Lake Meadow', -1, 0), N('grove', 'grove', '🌲', 'Pine Grove', -1, 1)],
    edges: [['camp', 'dock'], ['dock', 'reeds'], ['camp', 'meadow'], ['meadow', 'grove']],
  },
  {
    id: 'forest', n: 'Whispering Woods', e: '🌲', stage: 4, diff: 2, days: 3, biome: 'deepforest', store: true,
    water: 'stream', fish: true, mapPos: [0.6, 0.45], nav: true,
    temps: [70, 62, 52], wx: { day: { sun: 4, cloud: 4, rain: 2 }, eve: { sun: 3, cloud: 3, rain: 2 }, night: { sun: 4, cloud: 2, rain: 2, wind: 1 } },
    wildlife: ['deer', 'fox', 'owl', 'raccoon', 'bear', 'snake', 'woodpecker', 'squirrel', 'rabbit', 'wolf', 'bat', 'snail'],
    plants: ['pine', 'oak', 'fern', 'mushroom', 'poison_ivy', 'berries', 'maple'],
    fishPool: ['trout', 'bluegill', 'catfish'],
    tracks: ['deer', 'raccoon', 'rabbit', 'fox', 'bear'],
    goals: ['use_compass', 'find_landmarks', 'find_tracks', 'gather_wood', 'secure_food'],
    learn: ['🧭', '🐾', '🪵', '🗺️'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('creek', 'creek', '💦', 'Babbling Creek', -1, 0), N('lake', 'lake', '🏞️', 'Hidden Lake', 1, -1),
      N('bigoak', 'grove', '🌳', 'Giant Oak', 0, -1), N('falls', 'waterfall', '🌊', 'Misty Falls', -1, -1), N('cave', 'cave', '🕳️', 'Old Cave', 1, 1),
      N('marker', 'trail', '🪧', 'Trail Marker', 0, 1)],
    edges: [['camp', 'creek'], ['camp', 'lake'], ['camp', 'bigoak'], ['creek', 'falls'], ['bigoak', 'falls'], ['camp', 'marker'], ['marker', 'cave'], ['bigoak', 'lake']],
    missions: [
      { goal: 'lake', text: 'Find the lake', dir: 'NE' },
      { goal: 'falls', text: 'Find the waterfall', dir: 'W' },
      { goal: 'cave', text: 'Find the old cave', dir: 'SE' },
    ],
  },
  {
    id: 'mountain', n: 'Eagle Ridge', e: '🏔️', stage: 5, diff: 3, days: 3, biome: 'mountain', store: true,
    water: 'stream', fish: false, mapPos: [0.74, 0.25],
    temps: [62, 50, 36], wx: { day: { sun: 5, cloud: 3, wind: 2 }, eve: { cloud: 3, wind: 3, rain: 1 }, night: { sun: 3, wind: 3, rain: 1 } },
    script: { 2: { eve: 'wind', night: 'storm' } },
    wildlife: ['eagle', 'goat', 'bighorn', 'squirrel', 'owl', 'fox', 'wolf', 'songbird'],
    plants: ['pine', 'wildflower', 'fern', 'clover'],
    rocks: ['granite', 'quartz', 'fossil'],
    goals: ['dress_warm', 'storm_ready', 'wood_dry', 'fire_safe', 'build_shelter'],
    learn: ['🧥', '💨', '⛈️', '🌡️'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('ridge', 'ridge', '⛰️', 'Eagle Ridge View', 0, -1), N('creek', 'creek', '💦', 'Snowmelt Creek', -1, 0),
      N('cave', 'cave', '🕳️', 'Rock Shelter', 1, -1), N('meadow', 'meadow', '🌸', 'Alpine Meadow', 1, 0)],
    edges: [['camp', 'ridge'], ['camp', 'creek'], ['ridge', 'cave'], ['camp', 'meadow'], ['meadow', 'cave']],
    missions: [{ goal: 'ridge', text: 'Hike to the ridge', dir: 'N' }, { goal: 'cave', text: 'Find the rock shelter', dir: 'SE' }],
  },
  {
    id: 'river', n: 'Rushing River', e: '🌊', stage: 6, diff: 3, days: 2, biome: 'river', store: true,
    water: 'river', fish: true, mapPos: [0.86, 0.55],
    temps: [74, 66, 56], wx: { day: { sun: 4, cloud: 3, rain: 2 }, eve: { cloud: 3, rain: 3 }, night: { rain: 3, sun: 2, wind: 1 } },
    script: { 1: { eve: 'rain', night: 'rain' } },
    wildlife: ['beaver', 'otter', 'duck', 'frog', 'turtle', 'deer', 'raccoon', 'eagle', 'songbird', 'firefly'],
    plants: ['oak', 'fern', 'wildflower', 'berries', 'poison_ivy'],
    fishPool: ['trout', 'bass', 'catfish'],
    goals: ['high_ground', 'build_bridge', 'treat_water', 'catch_fish'],
    learn: ['🌊', '⬆️', '🌉', '💧'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('crossing', 'creek', '🌉', 'Creek Crossing', 1, 0, { bridge: true }), N('bank', 'lake', '🎣', 'River Bend', 0, 1),
      N('far', 'meadow', '🌼', 'Far Meadow', 2, 0), N('grove', 'grove', '🌳', 'Willow Grove', -1, 0)],
    edges: [['camp', 'crossing'], ['crossing', 'far', { needBridge: true }], ['camp', 'bank'], ['camp', 'grove']],
  },
  {
    id: 'wild', n: 'Wilderness Expedition', e: '🦅', stage: 7, diff: 3, days: 3, biome: 'wild', store: true,
    water: 'lake', fish: true, mapPos: [0.9, 0.18], expert: true,
    temps: [68, 56, 42], wx: { day: { sun: 4, cloud: 3, rain: 2, wind: 1 }, eve: { cloud: 3, rain: 2, wind: 2 }, night: { sun: 3, rain: 2, wind: 2, storm: 1 } },
    wildlife: ['deer', 'bear', 'eagle', 'fox', 'wolf', 'owl', 'beaver', 'otter', 'goat', 'raccoon', 'frog', 'duck'],
    plants: ['pine', 'fern', 'mushroom', 'berries', 'poison_ivy', 'maple'],
    fishPool: ['trout', 'bass', 'catfish', 'crappie'],
    tracks: ['deer', 'bear', 'fox', 'raccoon'],
    goals: ['dress_warm', 'treat_water', 'catch_fish', 'secure_food', 'fire_safe', 'use_compass', 'clean_site'],
    learn: ['⭐', '🧭', '⛈️', '🎣'],
    nodes: [N('camp', 'camp', '⛺', 'Camp', 0, 0), N('shore', 'dock', '🛶', 'Wild Shore', 1, 0), N('ridge', 'ridge', '⛰️', 'Lookout', 0, -1),
      N('falls', 'waterfall', '🌊', 'Thunder Falls', -1, -1), N('creek', 'creek', '💦', 'Cold Creek', -1, 0), N('cave', 'cave', '🕳️', 'Bear Den (far)', 1, -1), N('grove', 'grove', '🌲', 'Old Growth', 0, 1)],
    edges: [['camp', 'shore'], ['camp', 'ridge'], ['camp', 'creek'], ['creek', 'falls'], ['ridge', 'falls'], ['ridge', 'cave'], ['camp', 'grove']],
    missions: [{ goal: 'falls', text: 'Find the falls', dir: 'NW' }, { goal: 'ridge', text: 'Reach the lookout', dir: 'N' }],
  },
];
export const tripById = id => TRIPS.find(t => t.id === id);

export const WILDLIFE = {
  deer:      { n: 'White-tailed Deer', e: '🦌', hab: '🌲🌾', food: '🌿', act: '🌅🌇', shy: 0.8, time: 'dawnDusk', where: 'ground', tip: 'Deer flee from fast movement.' },
  squirrel:  { n: 'Squirrel', e: '🐿️', hab: '🌳', food: '🌰', act: '☀️', shy: 0.4, time: 'day', where: 'ground', tip: 'Squirrels bury nuts for winter.' },
  raccoon:   { n: 'Raccoon', e: '🦝', hab: '🌲💧', food: '🍎🐟🥫', act: '🌙', shy: 0.3, time: 'night', where: 'ground', tip: 'Clever paws open coolers!' },
  fox:       { n: 'Red Fox', e: '🦊', hab: '🌲🌾', food: '🐭🫐', act: '🌅🌇', shy: 0.8, time: 'dawnDusk', where: 'ground', tip: 'Foxes hear tiny mice under snow.' },
  owl:       { n: 'Great Horned Owl', e: '🦉', hab: '🌲', food: '🐭', act: '🌙', shy: 0.5, time: 'night', where: 'tree', tip: 'Owls fly almost silently.' },
  rabbit:    { n: 'Cottontail Rabbit', e: '🐇', hab: '🌾', food: '🌿', act: '🌅🌇', shy: 0.7, time: 'dawnDusk', where: 'ground', tip: 'Rabbits freeze to hide.' },
  snake:     { n: 'Garter Snake', e: '🐍', hab: '🌾🪨', food: '🐸', act: '☀️', shy: 0.6, time: 'day', where: 'ground', tip: 'Give snakes space and walk around.' },
  bear:      { n: 'Black Bear', e: '🐻', hab: '🌲', food: '🫐🐟', act: '🌅🌇', shy: 0.2, time: 'dawnDusk', where: 'far', tip: 'Watch bears only from far away.' },
  songbird:  { n: 'Songbird', e: '🐦', hab: '🌳', food: '🐛🌾', act: '🌅☀️', shy: 0.6, time: 'day', where: 'tree', tip: 'Birds sing most at sunrise.' },
  woodpecker:{ n: 'Woodpecker', e: '🐦', hab: '🌲', food: '🐛', act: '☀️', shy: 0.5, time: 'day', where: 'tree', tip: 'Tap-tap-tap! Woodpeckers find bugs in bark.' },
  duck:      { n: 'Mallard Duck', e: '🦆', hab: '💧', food: '🌿🐛', act: '☀️', shy: 0.5, time: 'day', where: 'water', tip: 'Ducks have waterproof feathers.' },
  frog:      { n: 'Green Frog', e: '🐸', hab: '💧', food: '🦟', act: '🌇🌙', shy: 0.5, time: 'any', where: 'water', tip: 'Frogs eat lots of mosquitoes.' },
  turtle:    { n: 'Painted Turtle', e: '🐢', hab: '💧🪨', food: '🌿🐛', act: '☀️', shy: 0.5, time: 'day', where: 'water', tip: 'Turtles sunbathe on logs to warm up.' },
  beaver:    { n: 'Beaver', e: '🦫', hab: '💧🌳', food: '🌳', act: '🌇🌙', shy: 0.6, time: 'dawnDusk', where: 'water', tip: 'Beavers build dams from sticks.' },
  otter:     { n: 'River Otter', e: '🦦', hab: '🌊', food: '🐟', act: '☀️', shy: 0.5, time: 'day', where: 'water', tip: 'Otters love to play and slide.' },
  eagle:     { n: 'Bald Eagle', e: '🦅', hab: '⛰️💧', food: '🐟', act: '☀️', shy: 0.4, time: 'day', where: 'sky', tip: 'Eagles spot fish from high above.' },
  goat:      { n: 'Mountain Goat', e: '🐐', hab: '⛰️', food: '🌿', act: '☀️', shy: 0.4, time: 'day', where: 'ground', tip: 'Goats climb steep cliffs with grippy hooves.' },
  bighorn:   { n: 'Bighorn Sheep', e: '🐏', hab: '⛰️', food: '🌾', act: '☀️', shy: 0.6, time: 'day', where: 'ground', tip: 'Big curly horns grow all life long.' },
  wolf:      { n: 'Gray Wolf', e: '🐺', hab: '🌲⛰️', food: '🦌', act: '🌙', shy: 0.9, time: 'night', where: 'far', tip: 'Wolves howl to talk to their pack.' },
  bat:       { n: 'Little Brown Bat', e: '🦇', hab: '🕳️🌲', food: '🦟', act: '🌙', shy: 0.3, time: 'night', where: 'sky', tip: 'One bat eats hundreds of bugs a night.' },
  butterfly: { n: 'Butterfly', e: '🦋', hab: '🌼', food: '🌸', act: '☀️', shy: 0.2, time: 'day', where: 'air', tip: 'Butterflies taste with their feet.' },
  bee:       { n: 'Bumblebee', e: '🐝', hab: '🌼', food: '🌸', act: '☀️', shy: 0.1, time: 'day', where: 'air', tip: 'Bees help flowers make seeds.' },
  ladybug:   { n: 'Ladybug', e: '🐞', hab: '🌿', food: '🐛', act: '☀️', shy: 0.1, time: 'day', where: 'ground', tip: 'Ladybugs protect plants from pests.' },
  snail:     { n: 'Snail', e: '🐌', hab: '🌿💧', food: '🌿', act: '🌧️🌙', shy: 0.0, time: 'any', where: 'ground', tip: 'Snails carry their home.' },
  firefly:   { n: 'Firefly', e: '✨', hab: '🌾', food: '🌸', act: '🌙', shy: 0.1, time: 'night', where: 'air', tip: 'Fireflies flash to find friends.' },
};

export const PLANTS = {
  pine:       { n: 'Pine Tree', e: '🌲', tip: 'Pines stay green all year.' },
  oak:        { n: 'Oak Tree', e: '🌳', tip: 'Acorns grow into new oaks.' },
  maple:      { n: 'Maple', e: '🍁', tip: 'Maple leaves turn red in fall.' },
  fern:       { n: 'Fern', e: '🌿', tip: 'Ferns love shady, damp spots.' },
  wildflower: { n: 'Wildflower', e: '🌼', tip: 'Leave flowers for bees and others.' },
  sunflower:  { n: 'Sunflower', e: '🌻', tip: 'Young sunflowers follow the sun.' },
  clover:     { n: 'Clover', e: '☘️', tip: 'Rabbits love to munch clover.' },
  mushroom:   { n: 'Wild Mushroom', e: '🍄', tip: 'Never eat wild mushrooms.', warn: true },
  berries:    { n: 'Wild Berries', e: '🫐', tip: 'Only eat berries an adult says are safe.', warn: true },
  poison_ivy: { n: 'Poison Ivy', e: '🍃', tip: 'Leaves of three, let it be!', warn: true },
};

export const ROCKS = {
  granite: { n: 'Granite', e: '🪨', tip: 'Granite formed from cooled magma.' },
  quartz:  { n: 'Quartz', e: '💎', tip: 'Quartz crystals sparkle in sun.' },
  fossil:  { n: 'Shell Fossil', e: '🐚', tip: 'This mountain was once under the sea!' },
};

export const FISH = {
  bluegill: { n: 'Bluegill', col: ['#5b8fb0', '#e8a23a'], len: 0.7, bait: ['worm'], depth: 0, time: ['day', 'dawnDusk'], fight: 0.5, tip: 'Bluegill hide near weeds in shallow water.' },
  bass:     { n: 'Largemouth Bass', col: ['#5f8a3c', '#d9e3b0'], len: 1.0, bait: ['lure', 'minnow'], depth: 1, time: ['dawnDusk'], fight: 0.9, tip: 'Bass hunt at dawn and dusk.' },
  catfish:  { n: 'Catfish', col: ['#6b6258', '#cfc4b0'], len: 1.1, bait: ['worm', 'minnow'], depth: 2, time: ['night', 'dawnDusk'], fight: 0.8, tip: 'Catfish feel for food with whiskers.' },
  trout:    { n: 'Rainbow Trout', col: ['#8aa0a8', '#e37c8e'], len: 0.9, bait: ['lure', 'worm'], depth: 1, time: ['dawnDusk', 'day'], fight: 0.8, cold: true, tip: 'Trout love cold, clean water.' },
  crappie:  { n: 'Crappie', col: ['#9aa3a0', '#3d4a45'], len: 0.7, bait: ['minnow'], depth: 1, time: ['dawnDusk', 'night'], fight: 0.5, tip: 'Crappie swim in schools.' },
};
export const BAITS = { worm: { e: '🪱', n: 'Worm' }, lure: { e: '🪝', n: 'Lure' }, minnow: { e: '🐟', n: 'Minnow' } };

export const TRACKS = {
  deer:    { e: '🦌', n: 'Deer tracks' },
  raccoon: { e: '🦝', n: 'Raccoon tracks' },
  rabbit:  { e: '🐇', n: 'Rabbit tracks' },
  fox:     { e: '🦊', n: 'Fox tracks' },
  bear:    { e: '🐻', n: 'Bear tracks' },
};

export const SKILLS = {
  camping: { e: '🏕️', n: 'Camping' }, firecraft: { e: '🔥', n: 'Firecraft' }, fishing: { e: '🎣', n: 'Fishing' },
  navigation: { e: '🧭', n: 'Navigation' }, cooking: { e: '🍳', n: 'Cooking' }, nature: { e: '🌲', n: 'Nature' },
  engineering: { e: '🔨', n: 'Engineering' }, first_aid: { e: '🩹', n: 'First Aid' }, weather: { e: '⛅', n: 'Weather' },
  budgeting: { e: '💰', n: 'Budgeting' },
};
export const LEVELS = [0, 20, 50, 100, 180, 300];

export const BADGES = {
  camp_builder:     { e: '🏕️', n: 'Camp Builder', need: ['tentsGood', 5], tip: 'Set up five tents correctly.' },
  fire_starter:     { e: '🔥', n: 'Fire Starter', need: ['fires', 5], tip: 'Build five successful fires.' },
  water_wise:       { e: '💧', n: 'Water Wise', need: ['waterSafe', 10], tip: 'Safely prepare water ten times.' },
  angler:           { e: '🎣', n: 'Angler', need: ['fish', 10], tip: 'Catch ten fish.' },
  trail_finder:     { e: '🧭', n: 'Trail Finder', need: ['nav', 5], tip: 'Complete five navigation missions.' },
  forest_guardian:  { e: '🌲', n: 'Forest Guardian', need: ['perfectNature', 5], tip: 'Earn five perfect Nature Scores.' },
  camp_chef:        { e: '🍳', n: 'Camp Chef', need: ['meals', 10], tip: 'Cook ten meals.' },
  storm_ready:      { e: '⛈️', n: 'Storm Ready', need: ['stormReady', 1], tip: 'Stay safe through a storm.' },
  wildlife_tracker: { e: '🐾', n: 'Wildlife Tracker', need: ['wildlife', 20], tip: 'Discover twenty animals.' },
  camp_engineer:    { e: '🔨', n: 'Camp Engineer', need: ['builds', 5], tip: 'Complete five building challenges.' },
  first_night:      { e: '🌙', n: 'First Night Out', need: ['nights', 1], tip: 'Sleep through your first night.' },
  dry_camp:         { e: '☂️', n: 'Dry Camp', need: ['dryNights', 1], tip: 'Stay dry through a rainy night.' },
  wildlife_wise:    { e: '🦝', n: 'Wildlife Wise', need: ['raccoonFoiled', 1], tip: 'Keep food safe from a raccoon.' },
  first_responder:  { e: '🩹', n: 'First Responder', need: ['aid', 3], tip: 'Treat three small injuries.' },
};

export const COSMETICS = {
  skin: ['#f8d5b8', '#e8b48f', '#c98c5f', '#9a6440', '#6b4128'],
  hair: ['#3b2618', '#7a4a24', '#d9a441', '#1f1a1a', '#b5452f', '#9aa0a6'],
  hairStyle: ['short', 'long', 'puff'],
  shirt: [
    { c: '#e4572e' }, { c: '#2e86de' }, { c: '#27ae60' }, { c: '#f1c40f' },
    { c: '#8e44ad', unlock: ['badge', 'fire_starter'] }, { c: '#e84393', unlock: ['badge', 'angler'] },
    { c: '#16a085', unlock: ['skill', 'nature', 2] }, { c: '#2d3436', unlock: ['skill', 'navigation', 2] },
  ],
  hat: [
    { id: 'none' }, { id: 'cap' }, { id: 'beanie', unlock: ['skill', 'camping', 2] },
    { id: 'ranger', unlock: ['badge', 'forest_guardian'] }, { id: 'bucket', unlock: ['skill', 'fishing', 2] },
  ],
  pack: [{ c: '#c0392b' }, { c: '#2c7a7b' }, { c: '#6c5ce7', unlock: ['skill', 'camping', 3] }, { c: '#f39c12', unlock: ['badge', 'trail_finder'] }],
  tent: [
    { c: '#ff8c32' }, { c: '#3fae5a', unlock: ['skill', 'camping', 2] }, { c: '#3b82f6', unlock: ['badge', 'camp_builder'] },
    { c: '#e74c3c', unlock: ['skill', 'firecraft', 2] }, { c: '#9b59b6', unlock: ['badge', 'storm_ready'] }, { c: '#f7c948', unlock: ['skill', 'weather', 2] },
  ],
  flag: [
    { id: 'none' }, { id: 'tri', c: '#e74c3c' }, { id: 'tri', c: '#27ae60', unlock: ['skill', 'nature', 2] },
    { id: 'star', c: '#2e86de', unlock: ['badge', 'wildlife_tracker'] }, { id: 'fish', c: '#16a085', unlock: ['badge', 'angler'] },
  ],
};

// One-sentence lessons shown when an alert/result icon is tapped.
export const LESSONS = {
  hungry: 'Food gives your body energy.',
  thirsty: 'Drink water often, especially when hot.',
  cold: 'Add layers or get near the fire.',
  hot: 'Take off a layer and find shade.',
  tired: 'Rest in the tent or a chair.',
  wet: 'Wet clothes make you cold fast.',
  fire_out: 'Fire needs heat, fuel, and air.',
  smoky: 'Too much wood squeezes out the air.',
  wet_wood: 'Wet wood hisses and smokes.',
  big_log: 'Big logs smother a small fire.',
  embers: 'Hidden embers can restart a fire.',
  untreated: 'Clear water can still have germs.',
  raccoon: 'Store food where animals cannot reach.',
  rain_in: 'A rain fly keeps rain out.',
  flooded: 'Low ground collects rainwater.',
  damp_floor: 'A ground tarp blocks wet ground.',
  wind_tent: 'Stakes and guy lines hold tents in wind.',
  trash: 'Pack out all trash.',
  ants: 'Trash near food attracts bugs.',
  pollute: 'Wash dishes far from lakes and streams.',
  dark: 'Pack a light for nighttime.',
  slope: 'On a slope you slide downhill all night.',
  lumpy: 'Clear rocks and sticks before pitching.',
  snag: 'Never camp under dead branches.',
  bugs: 'Bugs love damp spots by the water.',
  wood_wet: 'Keep firewood covered or off the ground.',
  raw: 'Undercooked food can make you sick.',
  burnt: 'Coals cook better than big flames.',
  off_trail: 'Stay on trails to protect plants.',
  chase: 'Move slowly to watch wildlife.',
  picked: 'Leave plants where they grow.',
  sunburn: 'A hat and shade block the sun.',
  heavy: 'A heavy pack tires you out.',
  fire_close: 'Keep fires far from tents.',
};
