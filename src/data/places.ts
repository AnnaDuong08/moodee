// Place list: Classroom has the full flow open; the others can be previewed
export type PlaceId = 'classroom' | 'my-room' | 'library' | 'museum' | 'cafe';

export interface Place {
  id: PlaceId;
  name: string;
  blurb: string;
  icon: string;
  available: boolean; // Implemented through the focus routine
  tint: string;
  // Preview screen: background (portrait image), where the character stands (image-ratio coordinates), and what you'll do in this space
  view?: { src: string; width: number; height: number; spot: { x: number; y: number; h: number }; pose: 'front' | 'back' };
  mode?: string;
  plans?: string[];
}

const base = import.meta.env.BASE_URL;

// Order on the home wheel (clockwise)
export const PLACES: Place[] = [
  { id: 'classroom', name: 'Classroom', blurb: 'Focus quietly with others.', icon: `${base}assets/places/icon-classroom.png`, available: true, tint: '#C9B8E0' },
  {
    id: 'cafe', name: 'Café', blurb: 'Meet, make something, or simply stay.', icon: `${base}assets/places/icon-cafe.png`, available: false, tint: '#F2C46B',
    view: { src: `${base}assets/places/cafe-backview.jpg`, width: 941, height: 1672, spot: { x: 0.5, y: 0.66, h: 0.4 }, pose: 'back' },
    mode: 'Be among people',
    plans: ['Sit alone or at a table where talking is okay', 'Meet friends you added in the Classroom', 'Order a drink with coins you earned'],
  },
  {
    id: 'library', name: 'Library', blurb: 'Give your thoughts somewhere to stay.', icon: `${base}assets/places/icon-library.png`, available: false, tint: '#B79BD6',
    view: { src: `${base}assets/places/library-backview.jpg`, width: 941, height: 1672, spot: { x: 0.56, y: 0.66, h: 0.38 }, pose: 'back' },
    mode: 'Sort your thoughts',
    plans: ['Find the thoughts you parked during focus', 'Write ideas down fast, then shelve them as books', 'Pull an old note back out when you need it'],
  },
  {
    id: 'museum', name: 'Museum', blurb: 'Turn moments into memories you can revisit.', icon: `${base}assets/places/icon-museum.png`, available: false, tint: '#E9A3B0',
    view: { src: `${base}assets/places/museum-backview.jpg`, width: 941, height: 1672, spot: { x: 0.22, y: 0.68, h: 0.36 }, pose: 'back' },
    mode: 'Remember',
    plans: ['Pick a moment you want to keep', 'Turn it into a small memory object', 'Place it on a pedestal and write its story'],
  },
  {
    id: 'my-room', name: 'My Room', blurb: 'Make this place feel like yours.', icon: `${base}assets/places/icon-my-room.png`, available: false, tint: '#E8955A',
    view: { src: `${base}assets/places/myroom.jpg`, width: 941, height: 1440, spot: { x: 0.56, y: 0.655, h: 0.5 }, pose: 'front' },
    mode: 'Make it yours',
    plans: ['Rest between sessions', 'Dress your buddy with outfits from the wardrobe', 'Decorate with things you earned'],
  },
];

// ───────── Classroom ─────────
// All coordinates are pixels of the original classroom image (941×1672)

export type Rect = [x0: number, y0: number, x1: number, y1: number];
export interface Seat {
  id: string;
  x: number; // Chair center (character foot position)
  y: number;
  side: 'left' | 'right';
}

const SEAT_ROWS: [y: number, xs: number[]][] = [
  [540, [235, 340, 610, 715]],
  [715, [218, 330, 620, 735]],
  [925, [200, 320, 625, 750]],
  [1165, [185, 315, 640, 770]],
];

export const CLASSROOM = {
  width: 941,
  height: 1672,
  // Top-view classroom: walk around to pick a seat
  top: {
    src: `${base}assets/places/classroom-topdown.png`,
    charH: 0.16, // Height of one character frame (relative to image height)
    start: { x: 470, y: 1390 }, // Start in front of the back door
    bounds: [70, 300, 872, 1440] as Rect,
    // Places you can't walk through (desk tops, teacher's desk)
    blockers: [
      [370, 285, 575, 410],
      [170, 430, 400, 500], [545, 430, 780, 500],
      [148, 595, 400, 670], [550, 595, 805, 670],
      [125, 795, 395, 880], [555, 795, 830, 880],
      [100, 1025, 390, 1120], [560, 1025, 855, 1120],
    ] as Rect[],
    seats: SEAT_ROWS.flatMap(([y, xs], r) =>
      xs.map((x, c): Seat => ({ id: `${r + 1}${'ABCD'[c]}`, x, y, side: c < 2 ? 'left' : 'right' })),
    ),
  },
  // Eye-level classroom behind the character: seated view
  back: {
    src: `${base}assets/places/classroom-backview.png`,
    chairs: `${base}assets/places/classroom-backview-chairs.png`,
    // Chair to sit in (row 3, aisle side). The character frame is cut at hipY and hidden behind the backrest
    seat: {
      left: { x: 175, hipY: 935 },
      right: { x: 790, hipY: 935 },
    },
    charH: 0.32,
    hipCut: 0.66, // Hip height within the character frame (everything below is cut)
  },
} as const;
