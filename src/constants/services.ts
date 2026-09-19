export interface Service {
  name: string;
  price: number;
}

export const BARBER_SERVICES: Service[] = [
  { name: 'Corte Masculino', price: 45.00 },
  { name: 'Barba Completa / Modelada', price: 35.00 },
  { name: 'Combo (Corte + Barba)', price: 70.00 },
  { name: 'Pezinho / Acabamento', price: 20.00 },
  { name: 'Sobrancelha na Navalha', price: 15.00 },
  { name: 'Pigmentação de Barba', price: 40.00 },
  { name: 'Lavagem e Penteado', price: 25.00 },
  { name: 'Selagem / Alisamento', price: 90.00 }
];

export const TATTOO_SERVICES = BARBER_SERVICES;
