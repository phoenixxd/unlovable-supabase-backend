export interface AmadeusHotel {
  hotelId: string;
}

export interface AmadeusHotelListResponse {
  data: AmadeusHotel[];
}

export interface AmadeusHotelOffer {
  // Add more fields as needed
  hotel: {
    hotelId: string;
    name: string;
    rating?: string;
  };
  offers: Array<{ price: { total: string; }; roomsCount: number; adults: number; }>;
}

export interface AmadeusHotelOffersResponse {
  data: AmadeusHotelOffer[];
}

export interface AmadeusFlightOffer {
  // Add more fields as needed
  from_city: string;
  to_city: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  currency: string;
  price: { total: string; };
  duration: string;
  direct_flight: boolean;
  layovers: number;
}

export interface AmadeusFlightOffersResponse {
  data: AmadeusFlightOffer[];
}
