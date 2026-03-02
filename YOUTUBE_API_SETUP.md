    # YouTube API Integration Setup Guide

## Backend Setup

### 1. Install Dependencies
```bash
cd Backend
npm install axios
```

### 2. Get YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key

### 3. Environment Configuration
Create `.env` file in Backend directory:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bini_db

# JWT Configuration
API_SECRET_KEY=your_jwt_secret_key_here

# YouTube API Configuration
YOUTUBE_API_KEY=your_youtube_api_key_here

# Other Configuration
PORT=4000
NODE_ENV=development
```

Or copy from `.env.example` and update the values.

### 4. Start Backend Server
```bash
npm run dev
```

## Frontend Setup

The frontend is already configured to use the YouTube API service.

## API Endpoints

### Get Banner Videos (for carousel)
```
GET /v1/youtube/banner/videos
```

### Get All BINI Videos
```
GET /v1/youtube/videos
```

### Get Popular BINI Videos
```
GET /v1/youtube/videos/popular
```

### Get Video Details
```
GET /v1/youtube/videos/:videoId
```

## Features

### Backend Features:
- ✅ YouTube Data API v3 integration
- ✅ BINI channel video fetching
- ✅ Popular videos by view count
- ✅ Video details with statistics
- ✅ Error handling and fallbacks
- ✅ Clean API responses

### Frontend Features:
- ✅ Dynamic video loading from API
- ✅ Fallback videos if API fails
- ✅ Click to play videos in new tab
- ✅ Auto-rotating carousel
- ✅ Responsive design
- ✅ Loading states

## Usage

1. Set up your YouTube API key in the backend `.env` file
2. Start the backend server
3. The frontend banner will automatically load real BINI videos
4. Click on any video to open it in YouTube

## Notes

- The system uses BINI's official channel ID
- Videos are sorted by date (newest first)
- Banner shows top 5 popular videos
- Fallback videos are used if API fails
- All videos open in YouTube when clicked

## Troubleshooting

### API Key Issues:
- Make sure YouTube Data API v3 is enabled
- Check if API key has proper permissions
- Verify API key is correctly set in `.env`

### CORS Issues:
- Backend runs on port 4000
- Frontend should have access to backend APIs
- Check CORS configuration in backend

### No Videos Loading:
- Check backend console for API errors
- Verify internet connection
- Check YouTube API quota limits
