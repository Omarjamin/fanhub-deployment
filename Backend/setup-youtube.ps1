# YouTube API Key Setup Script (PowerShell)

Write-Host "Setting up YouTube API key..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# Add YouTube API key
Write-Host "Adding YouTube API key to .env file..." -ForegroundColor Yellow
(Get-Content ".env") -replace "YOUTUBE_API_KEY=your_youtube_api_key_here", "YOUTUBE_API_KEY=AIzaSyARZtQMbyLPhjOY4SRgmCg6Y9dg26eZtxg" | Set-Content ".env"

Write-Host "✅ YouTube API key has been added to .env file!" -ForegroundColor Green
Write-Host "🚀 You can now start the backend server with: npm run dev" -ForegroundColor Cyan
