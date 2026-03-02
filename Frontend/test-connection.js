// Test connection from frontend to backend
async function testConnection() {
  console.log('🔗 Testing frontend to backend connection...');
  
  try {
    const response = await fetch('http://localhost:4000/v1/youtube/banner/videos');
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('✅ Connection successful!');
    console.log('📊 Data:', data);
    
    if (data.success) {
      console.log(`🎬 Found ${data.data.length} videos`);
      return true;
    } else {
      console.log('❌ API returned error:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

// Auto-run test
testConnection();
