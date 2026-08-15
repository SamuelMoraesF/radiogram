export interface RadiogramPreamble {
  number: number;
  precedence: 'R' | 'W' | 'P' | 'EMERGENCY';
  hx: string | null;
  stationOfOrigin: string;
  check: number;
  placeOfOrigin: string;
  timeField: string;
  date: string;
}

export interface RadiogramAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface Radiogram {
  preamble: RadiogramPreamble;
  address: RadiogramAddress;
  text: string;
  signature: string;
  scenario?: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AppMode = 'receive' | 'transmit';
