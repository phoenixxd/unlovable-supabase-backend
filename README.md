# Travel Planner Supabase Backend

A sophisticated travel planning system built with Supabase Edge Functions that
integrates OpenAI GPT-4 and Amadeus APIs to provide intelligent travel
recommendations with real-time pricing data.

## 🚀 Features

- **AI-Powered Recommendations**: Uses OpenAI GPT-4 to generate personalized
  travel destination recommendations
- **Real-Time Pricing**: Integrates with Amadeus APIs to fetch live hotel and
  flight prices
- **Parallel Processing**: Optimized performance with parallel API calls for all
  destinations
- **Smart Filtering**: Only includes destinations with available hotel and
  flight data
- **CORS Support**: Ready for frontend integration with proper CORS headers
- **Error Handling**: Robust error handling with graceful fallbacks
- **TypeScript**: Fully typed with strong TypeScript interfaces
- **Auto-Formatting**: VS Code configuration for consistent code formatting

## 🏗️ Architecture

The system follows a three-step process:

1. **Initial Recommendations**: OpenAI generates destination suggestions based
   on user preferences
2. **Price Fetching**: Parallel Amadeus API calls fetch hotel and flight prices
   for each destination
3. **Final Recommendations**: OpenAI processes the pricing data to provide final
   travel recommendations

## 📁 Project Structure

```
travel-planner-supabase/
├── supabase/
│   ├── functions/
│   │   └── gcp-openai-integration/
│   │       ├── amadeus/
│   │       │   ├── amadeus.ts          # Amadeus API integration
│   │       │   └── model.ts            # TypeScript interfaces
│   │       ├── handlers.ts             # Main request handlers
│   │       ├── openai.ts               # OpenAI API integration
│   │       ├── prompts.ts              # AI prompts
│   │       └── index.ts                # Function entry point
│   ├── config.toml                     # Supabase configuration
│   └── *.json                          # Sample API responses
├── .vscode/
│   └── settings.json                   # VS Code configuration
├── package.json                        # Node.js dependencies
├── tsconfig.json                       # TypeScript configuration
└── README.md                           # This file
```

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/) (for local development)
- OpenAI API key
- Amadeus API credentials

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/phoenixxd/unlovable-supabase-backend.git
cd unlovable-supabase-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

```bash
# Login to Supabase
supabase login

# Link to your project (replace with your project ref)
supabase link --project-ref your-project-ref
```

### 4. Configure Environment Variables

Set up the following environment variables in your Supabase project:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Amadeus Configuration
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret
```

You can set these in the Supabase Dashboard:

1. Go to your project dashboard
2. Navigate to Settings > API
3. Add the environment variables

### 5. Local Development

```bash
# Start Supabase locally
supabase start

# Run the function locally
supabase functions serve gcp-openai-integration --env-file .env.local
```

## 🚀 Deployment

### Deploy to Supabase

```bash
# Deploy the function
supabase functions deploy gcp-openai-integration

# Verify deployment
supabase functions list
```

### Environment Variables for Production

Make sure to set the environment variables in your Supabase project dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Add the following environment variables:
   - `OPENAI_API_KEY`
   - `AMADEUS_API_KEY`
   - `AMADEUS_API_SECRET`

## 📡 API Usage

### Endpoint

```
POST https://your-project-ref.supabase.co/functions/v1/gcp-openai-integration
```

### Request Format

```json
{
    "answers": {
        "budget": "5000",
        "duration": "7 days",
        "preferences": ["beach", "culture"],
        "travelers": 2
    },
    "questionContext": {
        "origin": "Mumbai",
        "travelDates": "2024-06-15 to 2024-06-22"
    }
}
```

### Response Format

```json
{
  "trip_plan": [
    {
      "destination": "Bali, Indonesia",
      "recommendation": "Perfect for your beach and culture preferences...",
      "hotels": [...],
      "flights": [...],
      "total_cost": "4500"
    }
  ]
}
```

## 🔍 Testing

### Test the Function Locally

```bash
# Test with sample data
curl -X POST http://localhost:54321/functions/v1/gcp-openai-integration \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "budget": "5000",
      "duration": "7 days",
      "preferences": ["beach", "culture"]
    },
    "questionContext": {
      "origin": "Mumbai",
      "travelDates": "2024-06-15 to 2024-06-22"
    }
  }'
```

### Test Individual Components

```bash
# Test Amadeus integration
deno run --allow-net supabase/functions/gcp-openai-integration/amadeus/amadeus.ts
```

## 🛡️ Error Handling

The system includes comprehensive error handling:

- **API Failures**: Graceful fallbacks when Amadeus or OpenAI APIs fail
- **Empty Data**: Filters out destinations with no available pricing
- **Invalid Responses**: Handles malformed API responses
- **Rate Limiting**: Implements token caching for Amadeus API

## 🔧 Configuration

### VS Code Settings

The project includes optimized VS Code settings for:

- Auto-formatting on save
- Deno integration
- TypeScript support
- Auto-save functionality

### Amadeus API Configuration

- **Token Caching**: Automatic token refresh with 1-minute buffer
- **Parallel Processing**: All API calls run in parallel for optimal performance
- **Error Retry**: Automatic retry on token expiration

## 📊 Performance Optimizations

- **Parallel API Calls**: All hotel and flight requests run simultaneously
- **Token Caching**: Reduces authentication overhead
- **Smart Filtering**: Only processes destinations with available data
- **Response Limiting**: Limits results to 10 hotels and flights per destination

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the Supabase documentation
- Review the function logs in the Supabase dashboard

## 🔄 Version History

- **v1.0.0**: Initial release with OpenAI and Amadeus integration
- **v1.1.0**: Added parallel processing and improved error handling
- **v1.2.0**: Enhanced filtering and performance optimizations
