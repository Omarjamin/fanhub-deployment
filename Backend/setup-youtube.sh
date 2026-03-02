#!/bin/bash

# YouTube API Key Setup Script
echo "Setting up YouTube API key..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Add YouTube API key
echo "Adding YouTube API key to .env file..."
sed -i "s/YOUTUBE_API_KEY=your_youtube_api_key_here/YOUTUBE_API_KEY=AIzaSyARZtQMbyLPhjOY4SRgmCg6Y9dg26eZtxg/" .env

echo "✅ YouTube API key has been added to .env file!"
echo "🚀 You can now start the backend server with: npm run dev"
