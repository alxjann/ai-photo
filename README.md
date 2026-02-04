# AI Photo

An AI-powered photo management application built with React Native (Expo) and Node.js. This app allows users to search and organize their photos using AI-driven text vectorization and semantic search capabilities.

## Features

- 📱 Cross-platform mobile app (iOS, Android, Web)
- 🔍 Smart photo search functionality
- 🖼️ Photo gallery with grid view
- 🔐 User authentication with Supabase
- 🤖 AI-powered text vectorization using Azure AI services
- 📊 Modern UI with TailwindCSS/NativeWind

## Tech Stack

### Frontend
- **React Native** - Mobile framework
- **Expo** - Development platform
- **Expo Router** - File-based routing
- **NativeWind** - TailwindCSS for React Native
- **Supabase** - Authentication and database
- **Expo Media Library** - Access device photos

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Azure AI Inference** - AI/ML services for text vectorization
- **Supabase** - Backend as a service

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Expo CLI** - Install globally with `npm install -g expo-cli`
- **Git** - [Download](https://git-scm.com/)
- **iOS Simulator** (Mac only) or **Android Studio** (for emulator)
- **Expo Go app** (for physical device testing)

### Required Accounts
- **Supabase Account** - [Sign up](https://supabase.com/)
- **Azure Account** (for AI services) - [Sign up](https://azure.microsoft.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/alxjann/ai-photo.git
cd ai-photo
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

#### Configure Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
touch .env
```

Add the following environment variables:

```env
# Azure AI Configuration
AZURE_INFERENCE_ENDPOINT=your_azure_endpoint
AZURE_INFERENCE_API_KEY=your_azure_api_key

# Server Configuration
PORT=3000
```

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

#### Configure Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
touch .env
```

Add the following environment variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Running the Application

### Start the Backend Server

From the `backend` directory:

```bash
npm start
```

The backend server will start on `http://localhost:3000` (or the port specified in your .env file).

### Start the Frontend Application

From the `frontend` directory:

```bash
npm start
```

This will start the Expo development server. You'll see a QR code in your terminal.

#### Run on Different Platforms

- **iOS Simulator**: Press `i` in the terminal or run `npm run ios`
- **Android Emulator**: Press `a` in the terminal or run `npm run android`
- **Web Browser**: Press `w` in the terminal or run `npm run web`
- **Physical Device**: Scan the QR code with the Expo Go app (iOS) or Camera app (Android)

### Clear Cache (if needed)

If you encounter issues, try clearing the cache:

```bash
npm run clean
```

## Project Structure

```
ai-photo/
├── backend/
│   ├── index.js              # Express server entry point
│   ├── routes/
│   │   └── vector.js         # Vector/AI routes
│   ├── services/
│   │   └── vectorizeText.js  # Text vectorization service
│   ├── package.json
│   └── .env                  # Backend environment variables
│
├── frontend/
│   ├── app/
│   │   ├── _layout.jsx       # Root layout with tabs
│   │   ├── index.jsx         # Home screen
│   │   ├── test.jsx          # Photo gallery screen
│   │   ├── login.jsx         # Login screen
│   │   └── signup.jsx        # Signup screen
│   ├── supabase/
│   │   ├── authService.js    # Authentication service
│   │   └── supabaseClient.js # Supabase client configuration
│   ├── global.css            # Global styles
│   ├── tailwind.config.js    # TailwindCSS configuration
│   ├── package.json
│   └── .env                  # Frontend environment variables
│
└── README.md
```

## Configuration

### Supabase Setup

1. Create a new project on [Supabase](https://supabase.com/)
2. Get your project URL and anon key from the project settings
3. Add them to the frontend `.env` file

### Azure AI Services Setup

1. Create an Azure account and set up an AI Inference resource
2. Get your endpoint and API key
3. Add them to the backend `.env` file

## Development

### Key Commands

**Frontend:**
- `npm start` - Start Expo development server
- `npm run clean` - Start with cleared cache
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web

**Backend:**
- `npm start` - Start Express server
- `npm test` - Run tests (when available)

## Troubleshooting

### Common Issues

1. **Module not found errors**: Run `npm install` in the respective directory
2. **Metro bundler issues**: Run `npm run clean` to clear cache
3. **Permission errors**: Ensure you've granted photo library permissions
4. **Environment variables not loading**: Double-check `.env` file naming and location

### Getting Help

If you encounter issues:
1. Check that all prerequisites are installed
2. Verify environment variables are correctly set
3. Clear cache and reinstall dependencies
4. Check the [Expo documentation](https://docs.expo.dev/)
5. Check the [Supabase documentation](https://supabase.com/docs)

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

[alxjann](https://github.com/alxjann)
