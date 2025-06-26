import { fetchFlightPrices, fetchHotelPrices } from "./amadeus/amadeus.ts";
import {
  AmadeusFlightOffersResponse,
  AmadeusHotelOffersResponse,
} from "./amadeus/model.ts";
import {
  openaiChatCompletion,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
} from "./openai.ts";
import {
  finalRecommendationPrompt,
  finalRecommendationSystemPrompt,
  initialDestinationPrompt,
  initialDestinationSystemPrompt,
} from "./prompts.ts";

const pexelsApiKey = "cF0cQtQmYMxhUrV7xxkHgWwnI2gCSNkJbc5afllxULkM7ouQ3zsFjhNo";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface RecommendationRequestData {
  answers: Record<string, unknown>;
  questionContext: Record<string, unknown>;
}

export async function getDynamicRecommendations(
  data: RecommendationRequestData,
): Promise<Response> {
  const { answers, questionContext } = data;

  // 1. Get initial destination recommendations from OpenAI
  const initialRequestBody: OpenAIChatCompletionRequest = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: initialDestinationSystemPrompt },
      {
        role: "user",
        content: initialDestinationPrompt
          .replace("{{questionContext}}", JSON.stringify(questionContext))
          .replace("{{answers}}", JSON.stringify(answers)),
      },
    ],
    temperature: 0.7,
  };
  console.log("OpenAI Initial Request:", JSON.stringify(initialRequestBody));
  const initialResult: OpenAIChatCompletionResponse =
    await openaiChatCompletion(initialRequestBody);
  console.log("OpenAI Initial Response:", JSON.stringify(initialResult));
  let initialDestinations: Array<Record<string, unknown>>;
  try {
    initialDestinations = JSON.parse(initialResult.choices[0].message.content);
  } catch (e: unknown) {
    let msg = "";
    if (e instanceof Error) {
      msg = e.message;
    } else {
      msg = JSON.stringify(e);
    }
    throw new Error("Failed to parse initial OpenAI response, " + msg);
  }

  // 2. For each destination, fetch hotel and flight prices using only values from initialDestinations
  const amadeusApiResponse: Array<Record<string, unknown>> = [];
  if (!Array.isArray(initialDestinations)) {
    throw new Error("Initial destinations is not an array");
  }
  // Prepare all fetch promises in parallel for all destinations
  const fetchPromises = initialDestinations.map((entry) => {
    const dest = entry.destination as string;
    const originCity = entry.origin_city as string;
    const destinationCity = entry.destination_city as string;
    const checkInDate = entry.check_in_date as string;
    const checkOutDate = entry.check_out_date as string;
    const departureDate = entry.departure_date as string;
    const numberOfTravelers = (entry.numberOfTravelers as number) || 1;
    if (
      !dest || !originCity || !destinationCity || !checkInDate ||
      !checkOutDate || !departureDate
    ) {
      throw new Error(
        `Missing required value in initialDestinations entry: ${
          JSON.stringify(entry)
        }`,
      );
    }
    console.log("Amadeus Hotel Request:", {
      destinationCity,
      checkInDate,
      checkOutDate,
    });
    console.log("Amadeus Flight Request:", {
      originCity,
      destinationCity,
      departureDate,
      numberOfTravelers,
    });
    // Return a promise that resolves to the result for this destination
    return Promise.all([
      fetchHotelPrices(
        destinationCity,
        checkInDate,
        checkOutDate,
        numberOfTravelers,
      ).catch((e) => {
        if (e instanceof Error) {
          console.error("Hotel price fetch failed:", e.message);
        } else {
          console.error("Hotel price fetch failed:", e);
        }
        return { data: [] };
      }),
      fetchFlightPrices(
        originCity,
        destinationCity,
        departureDate,
        numberOfTravelers,
      ).catch((e) => {
        if (e instanceof Error) {
          console.error("Flight price fetch failed:", e.message);
        } else {
          console.error("Flight price fetch failed:", e);
        }
        return { data: [] };
      }),
    ]).then(([hotelPrices, flightPrices]) => ({
      dest,
      score: entry.score,
      hotelPrices,
      flightPrices,
    }));
  });
  // Wait for all fetches to complete
  const allResults = await Promise.all(fetchPromises);
  // Only push if both hotel and flight data are non-empty
  for (const result of allResults) {
    if (
      (result.hotelPrices?.data?.length > 0) &&
      (result.flightPrices?.data?.length > 0)
    ) {
      amadeusApiResponse.push({
        destination: result.dest,
        score: result.score,
        hotelPrices: result.hotelPrices,
        flightPrices: result.flightPrices,
      });
    }
  }

  // 3. Call OpenAI again with final recommendation prompt
  const finalPrompt = finalRecommendationPrompt
    .replace("{{questionContext}}", JSON.stringify(questionContext))
    .replace("{{answers}}", JSON.stringify(answers))
    .replace("{{amadeusApiResponse}}", JSON.stringify(amadeusApiResponse));

  const finalRequestBody: OpenAIChatCompletionRequest = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: finalRecommendationSystemPrompt },
      { role: "user", content: finalPrompt },
    ],
    temperature: 0.7,
  };
  const finalRequestString = JSON.stringify(finalRequestBody);
  console.log("OpenAI Final Request length:", finalRequestString.length);
  const chunkSize = 1000;
  for (let i = 0; i < finalRequestString.length; i += chunkSize) {
    console.log(
      `OpenAI Final Request chunk [${i}-${
        Math.min(i + chunkSize, finalRequestString.length)
      }]:`,
      finalRequestString.slice(i, i + chunkSize),
    );
  }
  const finalResult: OpenAIChatCompletionResponse = await openaiChatCompletion(
    finalRequestBody,
  );
  console.log("OpenAI Final Response:", JSON.stringify(finalResult));
  let recommendations: Record<string, unknown>;
  try {
    recommendations = JSON.parse(finalResult.choices[0].message.content);
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Failed to parse final OpenAI response:", e.message);
    } else {
      console.error("Failed to parse final OpenAI response:", e);
    }
    recommendations = { trip_plan: [] };
  }

  return new Response(JSON.stringify(recommendations), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export async function fetchPexelsImage(
  query: string,
): Promise<{ url: string; alt: string }> {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${
      encodeURIComponent(query)
    }&per_page=5`,
    {
      headers: {
        "Authorization": pexelsApiKey,
      },
    },
  );
  const data = await response.json();
  if (data.photos && data.photos.length > 0) {
    return {
      url: data.photos[0].src.original,
      alt: data.photos[0].alt || query,
    };
  } else {
    throw new Error("No images found");
  }
}
