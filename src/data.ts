import { TecEvent, Vehicle } from './types';

export const events: TecEvent[] = [
  {
    id: 'palm-beach-cars-coffee-2026',
    title: 'Cruise to Palm Beach Cars and Coffee',
    category: 'CRUISE + SHOW',
    date: 'Sunday, December 6, 2026',
    weekday: 'SUN', month: 'DEC', day: '06', year: '2026',
    time: '6:45 AM meetup',
    location: 'Palm Beach Cars & Coffee',
    address: '5000 T-Rex Avenue, Boca Raton',
    description: "Meet in Jupiter, pick up our friends in West Palm Beach, then cruise together to Boca Raton.",
    image: require('../assets/palm-beach-december-2026.jpg'),
    stops: [
      { time: '6:45', meridiem: 'AM', title: 'Casa Tequila — Jupiter', description: '4177 W Indiantown Road. Depart at 7:15 AM.' },
      { time: '7:30', meridiem: 'AM', title: 'Airport Hilton — West Palm Beach', description: '150 Australian Avenue. Join the group for the drive south.' },
      { time: '8:00', meridiem: 'AM', title: 'Palm Beach Cars & Coffee', description: '5000 T-Rex Avenue, Boca Raton.' }
    ]
  },
  {
    id: 'elliott-museum-2026',
    title: 'Cars & Coffee — Cruise to Stuart',
    category: 'CRUISE + CARS & COFFEE',
    date: 'Saturday, December 12, 2026',
    weekday: 'SAT', month: 'DEC', day: '12', year: '2026',
    time: '6:30 AM meetup · 7:10 AM departure',
    location: 'Elliott Museum',
    address: '825 NE Ocean Blvd, Stuart, FL 34996',
    description: 'Coffee in Jupiter followed by a casual 25-mile cruise north on US 1 to Elliott Museum.',
    image: require('../assets/elliott-museum-2026.png'),
    stops: [
      { time: '6:30', meridiem: 'AM', title: 'Brooklyn Water Bagel', description: '201 US 1, Jupiter. Coffee before departure.' },
      { time: '7:10', meridiem: 'AM', title: 'Cruise north to Stuart', description: 'Depart together for Elliott Museum.' },
      { time: '8:00', meridiem: 'AM', title: 'Elliott Museum', description: 'Cars & Coffee runs from 8:00 to 10:00 AM.' }
    ]
  },
  {
    id: 'welcome-2027',
    title: 'Welcome 2027 — New Year Meet',
    category: 'TEC MEET',
    date: 'Sunday, January 10, 2027',
    weekday: 'SUN', month: 'JAN', day: '10', year: '2027',
    time: '10:00 AM start',
    location: 'Brooklyn Water Bagel Company',
    address: '201 US 1, Jupiter, FL',
    description: 'Join The Enthusiast Collective for our first gathering of 2027.',
    image: require('../assets/welcome-2027-new-year-meet.png'),
    stops: [{ time: '10:00', meridiem: 'AM', title: 'Welcome 2027', description: 'Meet directly at Brooklyn Water Bagel Company.' }]
  },
  {
    id: 'saturday-social-2027',
    title: 'Saturday Social',
    category: 'TEC SOCIAL',
    date: 'Saturday, January 23, 2027',
    weekday: 'SAT', month: 'JAN', day: '23', year: '2027',
    time: '10:00 AM–1:00 PM',
    location: 'Prestige Creations by JA',
    address: '15837 Mercantile Ct, Unit A, Jupiter, FL 33478',
    description: 'Cars, coffee, product demonstrations, and a tour of the shop.',
    image: require('../assets/saturday-social.webp'),
    stops: [
      { time: '10:00', meridiem: 'AM', title: 'Saturday Social begins', description: 'Meet directly at Prestige Creations by JA.' },
      { time: '1:00', meridiem: 'PM', title: 'Event concludes', description: 'No separate cruise or pickup stop is scheduled.' }
    ]
  }
];

export const sampleVehicles: Vehicle[] = [
  { id: 'alex-mach1', owner: 'Alex', yearMake: '2022 FORD', model: 'Mustang Mach 1', description: 'Eruption Green. A garage worth getting up early for.', image: require('../assets/tec-splash-06.webp') },
  { id: 'morgan-supra', owner: 'Morgan', yearMake: 'TOYOTA', model: 'GR Supra', description: 'A different build. The same shared passion.', image: require('../assets/tec-splash-05.webp') },
  { id: 'jordan-amg', owner: 'Jordan', yearMake: 'MERCEDES-AMG', model: 'AMG', description: 'Every build has a story.', image: require('../assets/tec-splash-10.webp') }
];

export const gallery = [
  require('../assets/tec-splash-10.webp'),
  require('../assets/tec-splash-01.webp'),
  require('../assets/tec-splash-05.webp'),
  require('../assets/tec-splash-06.webp'),
  require('../assets/collective-cars.webp')
];
