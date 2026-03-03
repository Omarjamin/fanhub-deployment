// Fallback video if API fails
const FALLBACK_VIDEO = {
  videoId: 'wufUX5P2Ds8',
  title: 'Cherry On Top',
  subtitle: 'Official Music Video',
};

export default function Banner(root, data) {
  let latestVideo = FALLBACK_VIDEO;
  let moreVideos = [];
  const adminVideoUrl = data?.banner || '';
  const endpoint = adminVideoUrl
    ? `https://fanhub-deployment-production.up.railway.app/v1/youtube/videos?videoUrl=${encodeURIComponent(adminVideoUrl)}`
    : 'https://fanhub-deployment-production.up.railway.app/v1/youtube/videos';
  
  // Fetch latest videos from backend API
  fetch(endpoint)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      return response.json()
        .then(payload => {
          throw new Error(payload?.message || `API response not ok (${response.status})`);
        })
        .catch(() => {
          throw new Error(`API response not ok (${response.status})`);
        });
    })
    .then(payload => {
      const videos = Array.isArray(payload) ? payload : (payload?.data || []);
      if (videos && videos.length > 0) {
        latestVideo = videos[0];
        moreVideos = videos.slice(1, 5); // Get next 4 videos for "More Videos"
        
        // Update the main iframe with the latest video
        const iframe = root.querySelector('#bannerIframe');
        if (iframe) {
          const newSrc = `https://www.youtube.com/embed/${latestVideo.videoId}?controls=1&modestbranding=1&rel=0`;
          iframe.src = newSrc;
          iframe.title = `BINI - ${latestVideo.title}`;
        }
        
        // Render more videos section
        renderMoreVideos(root, moreVideos);
      }
    })
    .catch(error => {
      console.error('Using fallback video due to API error:', {
        endpoint,
        message: error?.message || String(error),
      });
    });

  const baseEmbedSrc = `https://www.youtube.com/embed/${latestVideo.videoId}?controls=1&modestbranding=1&rel=0`;

  function renderMoreVideos(root, videos) {
    if (videos.length === 0) return;
    
    const moreVideosHtml = videos.map((video, index) => `
      <div class="more-video-item" onclick="playVideo('${video.videoId}', '${video.title}')">
        <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}" class="video-thumbnail">
        <div class="video-info">
          <h4>${video.title}</h4>
          <p>Click to play</p>
        </div>
      </div>
    `).join('');
    const moreVideosSection = `
   
    `;
    
 
    
    // Insert after the banner-video-wrap
    const bannerVideoWrap = root.querySelector('.banner-video-wrap');
    if (bannerVideoWrap) {
      bannerVideoWrap.insertAdjacentHTML('afterend', moreVideosSection);
    }
  }

  // Make playVideo function global
  window.playVideo = function(videoId, title) {
    const iframe = root.querySelector('#bannerIframe');
    if (iframe) {
      const newSrc = `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&autoplay=1&mute=1`;
      iframe.src = newSrc;
      iframe.title = `BINI - ${title}`;
      iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  root.innerHTML += `
    <section id="home" class="banner">
        <img src="${data?.logo || '/BINI_logo.svg.png'}" alt="BINI" class="banner-logo">
        <p>${data.short_bio}</p>
        
        <div class="banner-video-wrap">
          <iframe
            id="bannerIframe"
            src="${baseEmbedSrc}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            title="BINI - ${latestVideo.title}"
            class="banner-iframe">
          </iframe>
          <button type="button" class="watch-latest-btn" id="watchLatestBtn" disabled>
            <span class="watch-latest-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </span>
            Watch latest release
          </button>
        </div>
    </section>
  `;
}


