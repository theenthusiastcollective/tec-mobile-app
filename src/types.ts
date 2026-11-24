export type Tab = 'home' | 'events' | 'cruise' | 'garage' | 'photos';
export type Plan = 'Going' | 'Interested' | "Can't make it";

export type EventStop = {
  time: string;
  meridiem: string;
  title: string;
  description: string;
};

export type TecEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  weekday: string;
  month: string;
  day: string;
  year: string;
  time: string;
  location: string;
  address: string;
  description: string;
  image: number;
  stops: EventStop[];
};

export type Vehicle = {
  id: string;
  owner: string;
  yearMake: string;
  model: string;
  description: string;
  image: number;
};
