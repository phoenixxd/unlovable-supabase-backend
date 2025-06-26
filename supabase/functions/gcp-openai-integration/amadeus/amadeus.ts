import { AmadeusHotelOffersResponse, AmadeusHotelListResponse, AmadeusHotel, AmadeusFlightOffersResponse } from "./model.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

// amadeus.ts
const amadeusApiKey = Deno.env.get('AMADEUS_API_KEY');
const amadeusApiSecret = Deno.env.get('AMADEUS_API_SECRET');

let cachedAccessToken: string = '';
let accessTokenExpiry: number | null = null;

// Add types for raw Amadeus hotel offer and offer
interface AmadeusRawHotelOffer {
  hotel: {
    hotelId: string;
    name: string;
    rating?: string;
  };
  offers: AmadeusRawOffer[];
}
interface AmadeusRawOffer {
  price?: { total?: string };
  rooms?: unknown[];
  guests?: { adults?: number };
  roomQuantity?: number;
  room?: unknown;
}

export async function getAmadeusAccessToken(): Promise<string> {
  if (!amadeusApiKey || !amadeusApiSecret) {
    throw new Error('Amadeus API key and secret must be set in environment variables');
  }
  // If we have a cached token and it's not expired, return it
  if (cachedAccessToken && accessTokenExpiry && Date.now() < accessTokenExpiry) {
    return cachedAccessToken;
  }
  const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: amadeusApiKey,
      client_secret: amadeusApiSecret,
    }),
  });
  if (!response.ok) throw new Error('Amadeus auth failed');
  const data = await response.json();
  cachedAccessToken = data.access_token;
  // expires_in is in seconds
  accessTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min before expiry
  return cachedAccessToken;
}

async function fetchWithAutoRefresh<T>(url: string, options: RequestInit): Promise<T> {
  let accessToken = await getAmadeusAccessToken();
  let resp = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${accessToken}` } });
  if (resp.status === 401) {
    // Try to parse error code
    try {
      const errorBody = await resp.clone().json();
      if (errorBody.errors && errorBody.errors[0]?.code === 38192) {
        // Access token expired, refresh and retry once
        cachedAccessToken = '';
        accessToken = await getAmadeusAccessToken();
        resp = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${accessToken}` } });
      }
    } catch {
      throw new Error('Amadeus API call failed with 401');
    }
  }
  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('Amadeus API error:', errorText);
    throw new Error('Amadeus API call failed: ' + errorText);
  }
  return await resp.json() as T;
}

export async function fetchHotelPrices(cityCode: string, checkInDate: string = '', checkOutDate: string = '', adults: number = 1): Promise<AmadeusHotelOffersResponse> {
  try {
    if (!checkInDate || !checkOutDate) {
      throw new Error('checkInDate and checkOutDate are required and must be strings');
    }
    // Step 1: Get hotel IDs for the city
    const hotelListUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`;
    const hotelListData = await fetchWithAutoRefresh<AmadeusHotelListResponse>(hotelListUrl, { headers: {} });
    const hotelIds = hotelListData.data?.map((h: AmadeusHotel) => h.hotelId).filter(Boolean);
    if (!hotelIds || hotelIds.length === 0) {
      return { data: [] };
    }
    // Step 2: Get offers for those hotels (limit to 20 IDs for URL length)
    const limitedHotelIds = hotelIds.slice(0, 20).join(',');
    const offersUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${limitedHotelIds}&adults=${adults}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`;
    const offersData = await fetchWithAutoRefresh<{ data: AmadeusRawHotelOffer[] }>(offersUrl, { headers: {} });
    const hotelArray: AmadeusRawHotelOffer[] = Array.isArray(offersData.data) ? offersData.data : [];
    if (!hotelArray.length) {
      return { data: [] };
    }
    let sorted: AmadeusRawHotelOffer[] = hotelArray;
    if (sorted.some(h => h.hotel.rating)) {
      sorted = [...sorted].sort((a, b) => {
        const ra = a.hotel.rating ? parseFloat(a.hotel.rating) : 0;
        const rb = b.hotel.rating ? parseFloat(b.hotel.rating) : 0;
        return rb - ra;
      });
    }
    const filtered: AmadeusRawHotelOffer[] = sorted.filter(h => !h.hotel.rating || parseFloat(h.hotel.rating) >= 3);
    if (!filtered.length) {
      return { data: [] };
    }
    // Format to only include the fields in AmadeusHotelOffer, and always return up to 10 hotels
    const formatted = filtered.slice(0, 10).map((h) => {
      return {
        hotel: {
          hotelId: h.hotel.hotelId,
          name: h.hotel.name,
          rating: h.hotel.rating,
        },
        offers: Array.isArray(h.offers)
          ? h.offers.map((o: AmadeusRawOffer) => {
              let roomsCount = 0;
              if (Array.isArray(o.rooms)) {
                roomsCount = o.rooms.length;
              } else if (o.roomQuantity && typeof o.roomQuantity === 'number') {
                roomsCount = o.roomQuantity;
              } else if (o.room && typeof o.room === 'object') {
                roomsCount = 1;
              }
              return {
                price: { total: o.price?.total ?? '' },
                roomsCount,
                adults: typeof o.guests?.adults === 'number' ? o.guests.adults : 0,
              };
            })
          : [],
      };
    });
    return { data: formatted };
  } catch (e) {
    return { data: [] };
  }
}

export async function fetchFlightPrices(origin: string, destination: string, departureDate: string, adults: number = 1): Promise<AmadeusFlightOffersResponse> {
  try {
    const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${departureDate}&adults=${adults}&currencyCode=INR`;
    const offersData = await fetchWithAutoRefresh<{ data: unknown[] }>(url, { headers: {} });
    const limited = Array.isArray(offersData.data) ? offersData.data.slice(0, 10) : [];
    if (!limited.length) {
      return { data: [] };
    }
    // Format to only include the fields in AmadeusFlightOffer
    const formatted = limited.map(f => {
      const flight = f as Record<string, unknown>;
      return {
        from_city: (flight.itineraries as any)?.[0]?.segments?.[0]?.departure?.iataCode || '',
        to_city: (flight.itineraries as any)?.[0]?.segments?.slice(-1)?.[0]?.arrival?.iataCode || '',
        departure_date: (flight.itineraries as any)?.[0]?.segments?.[0]?.departure?.at || '',
        return_date: (flight.itineraries as any)?.[1]?.segments?.[0]?.departure?.at || undefined,
        adults: (flight.travelerPricings as any)?.[0]?.travelerType === 'ADULT' ? 1 : 0, // crude, for demo
        currency: (flight.price as any)?.currency || '',
        price: { total: (flight.price as any)?.total || '' },
        duration: (flight.itineraries as any)?.[0]?.duration || '',
        direct_flight: ((flight.itineraries as any)?.[0]?.segments?.length || 0) === 1,
        layovers: ((flight.itineraries as any)?.[0]?.segments?.length || 1) - 1,
      };
    });
    return { data: formatted };
  } catch (e) {
    return { data: [] };
  }
}

// --- Utility test functions for development ---
// Run with: deno run --allow-net supabase/functions/gcp-openai-integration/amadeus.ts
if (import.meta.main) {
  (async () => {
    // Use next month's date for testing
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 10);
    const checkIn = nextMonth.toISOString().slice(0, 10);
    const checkOut = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonth.getDate() + 2).toISOString().slice(0, 10);

    console.log('Testing fetchHotelPrices...');
    const hotelRaw = await fetchHotelPrices('BOM', checkIn, checkOut, 2);
    console.log('Formatted hotel prices:', JSON.stringify(hotelRaw, null, 2));

    console.log('Testing fetchFlightPrices...');
    const flightRaw = await fetchFlightPrices('BOM', 'DEL', checkIn, 1);
    console.log('Formatted flight prices:', JSON.stringify(flightRaw, null, 2));
  })();
} 