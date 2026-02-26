# Akashic
### AI-Powered Photo Memory App

Search your photos using natural language. Upload a photo, and Elysium's AI will analyze it — then find it later by searching "sunset at the beach" or "my dog playing outside."

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo |
| Styling | NativeWind (Tailwind CSS) |
| Navigation | Expo Router |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | GitHub Models (GPT-4o-mini + text-embedding-3-small) |
| Deployment | Railway |

---

## 📱 Running the App

### Android
Download the latest APK and install it directly on your phone:

> **[App Link](https://expo.dev/artifacts/eas/h2ZD4XtiEpMMVs6jw3vVyM.apk)**

Allow "Install from unknown sources"
Allow "Access to all media files" 

### iOS
Install **Expo Go** from the App Store, then follow the development setup below.

> A native iOS build for direct install (no Expo Go) is coming in a future release.

---

## 🛠 Development Setup

### Prerequisites
- Node.js `v18+`
- Expo Go app (iOS) or Android device/emulator

### 1. Clone the repo

```bash
git clone https://github.com/alxjann/ai-photo
cd ai-photo
git checkout main
```

### 2. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run the schema from [this document](https://docs.google.com/document/d/1iVtiKREErGRZk6EzYdh4ImE3xqFgSn__qslUvNNncIU/edit?usp=sharing)
4. Go to **Settings → API** and copy your:
   - Project URL
   - Anon public key

### 3. Get a GitHub Models token

1. Go to [github.com/marketplace/models](https://github.com/marketplace/models)
2. Create a Personal Access Token with Models access
3. Save it — this is your `GPT_TOKEN`

### 4. Configure environment variables

Create `backend/.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GPT_TOKEN=your_github_models_token
PORT=8080
```

Create `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Start the backend

```bash
cd backend
npm install
npm start
```

### 6. Start the frontend

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS) or your Android camera.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/image` | Upload & process a single photo |
| `POST` | `/api/images/batch` | Batch upload photos |
| `POST` | `/api/search` | Search photos by natural language |
| `GET` | `/api/photo/:id` | Get full resolution photo |
| `DELETE` | `/api/photo/:id` | Delete a photo |

All endpoints require `Authorization: Bearer <token>` header.

---

## ❓ Troubleshooting

**App crashes on startup**
- Make sure `frontend/.env` has both Supabase variables set

**"No token provided" error**
- You're not logged in or the session expired — log out and back in

**Upload fails**
- Check Railway logs for the specific error
- Make sure `GPT_TOKEN` is set in Railway Variables

**Search returns no results**
- Try more specific queries like "sea turtle" instead of "ocean animals"
- Photos processed with the old prompt may need re-uploading

**Not using your Supabase DB?**
- If you build it yourself using eas, make sure that `frontend/eas.json` variables EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are your *own*.

---

## 👥 Contributors

Built by 
