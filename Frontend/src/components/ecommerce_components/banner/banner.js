const FALLBACK_VIDEO = {
  videoId: 'wufUX5P2Ds8',
  title: 'Cherry On Top',
  subtitle: 'Official Music Video',
  url: 'https://www.youtube.com/watch?v=wufUX5P2Ds8',
};

const DEFAULT_API_V1 = 'https://fanhub-deployment-production.up.railway.app/v1';

function getVideoUrl(video = {}) {
  if (video?.url) return String(video.url).trim();
  if (video?.videoUrl) return String(video.videoUrl).trim();
  if (video?.link) return String(video.link).trim();
  if (video?.videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;
  return FALLBACK_VIDEO.url;
}

function getEmbedUrl(videoId, autoplay = false) {
  const params = autoplay
    ? '?controls=1&modestbranding=1&rel=0&autoplay=1'
    : '?controls=1&modestbranding=1&rel=0';
  return `https://www.youtube.com/embed/${videoId}${params}`;
}

function normalizeVideo(video = {}) {
  const videoId = String(video?.videoId || video?.id || '').trim();
  if (!videoId) return null;

  return {
    videoId,
    title: String(video?.title || 'Latest Release').trim(),
    subtitle: String(video?.subtitle || video?.description || 'Watch now').trim(),
    url: getVideoUrl(video),
  };
}

function renderMoreVideos(root, videos) {
  const host = root.querySelector('#bannerMoreVideos');
  if (!host) return;

  if (!Array.isArray(videos) || !videos.length) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <div class="more-videos-section">
      <h3>More Videos</h3>
      <div class="more-videos-grid">
        ${videos.map((video) => `
          <button class="more-video-item" type="button" data-video-id="${video.videoId}" data-video-title="${video.title}">
            <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}" class="video-thumbnail">
            <div class="video-info">
              <h4>${video.title}</h4>
              <p>${video.subtitle || 'Click to play'}</p>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function updateBannerVideo(root, video, { autoplay = false } = {}) {
  const iframe = root.querySelector('#bannerIframe');
  const button = root.querySelector('#watchLatestBtn');
  const heading = root.querySelector('#bannerVideoTitle');
  const subheading = root.querySelector('#bannerVideoSubtitle');

  if (iframe) {
    iframe.src = getEmbedUrl(video.videoId, autoplay);
    iframe.title = video.title;
  }

  if (button) {
    button.disabled = false;
    button.dataset.videoUrl = video.url;
    button.textContent = `Watch ${video.title}`;
  }

  if (heading) {
    heading.textContent = video.title;
  }

  if (subheading) {
    subheading.textContent = video.subtitle || 'Official video';
  }
}

export default function Banner(root, data = {}) {
  let latestVideo = FALLBACK_VIDEO;
  const adminVideoUrl = data?.banner || '';
  const baseV1 = String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim().replace(/\/$/, '');
  const endpoint = adminVideoUrl
    ? `${baseV1}/youtube/videos?videoUrl=${encodeURIComponent(adminVideoUrl)}`
    : `${baseV1}/youtube/videos`;

  root.innerHTML += `
    <section id="home" class="banner">
      <img src="${data?.logo || '/BINI_logo.svg.png'}" alt="Site logo" class="banner-logo">
      <p>${data?.short_bio || ''}</p>

      <div class="banner-video-wrap">
        <div class="banner-video-meta">
          <h2 class="banner-title" id="bannerVideoTitle">${latestVideo.title}</h2>
          <p class="banner-video-subtitle" id="bannerVideoSubtitle">${latestVideo.subtitle}</p>
        </div>

        <iframe
          id="bannerIframe"
          src="${getEmbedUrl(latestVideo.videoId)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          title="${latestVideo.title}"
          class="banner-iframe">
        </iframe>

        <button type="button" class="watch-latest-btn" id="watchLatestBtn" data-video-url="${latestVideo.url}">
          Watch ${latestVideo.title}
        </button>
      </div>

      <div id="bannerMoreVideos"></div>
    </section>
  `;

  const section = root.querySelector('#home.banner');
  if (!section) return;

  section.addEventListener('click', (event) => {
    const watchButton = event.target.closest('#watchLatestBtn');
    if (watchButton) {
      const url = String(watchButton.dataset.videoUrl || '').trim();
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    const videoButton = event.target.closest('.more-video-item');
    if (!videoButton) return;

    const videoId = String(videoButton.dataset.videoId || '').trim();
    const title = String(videoButton.dataset.videoTitle || 'Video').trim();
    if (!videoId) return;

    updateBannerVideo(root, {
      videoId,
      title,
      subtitle: 'Now playing',
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    }, { autoplay: true });

    const iframe = root.querySelector('#bannerIframe');
    if (iframe) {
      iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  fetch(endpoint)
    .then((response) => {
      if (response.ok) return response.json();
      return response.json()
        .then((payload) => {
          throw new Error(payload?.message || `API response not ok (${response.status})`);
        })
        .catch(() => {
          throw new Error(`API response not ok (${response.status})`);
        });
    })
    .then((payload) => {
      const rawVideos = Array.isArray(payload) ? payload : (payload?.data || []);
      const videos = rawVideos.map((video) => normalizeVideo(video)).filter(Boolean);
      if (!videos.length) return;

      latestVideo = videos[0];
      updateBannerVideo(root, latestVideo);
      renderMoreVideos(root, videos.slice(1, 5));
    })
    .catch((error) => {
      console.error('Using fallback video due to API error:', {
        endpoint,
        message: error?.message || String(error),
      });
      updateBannerVideo(root, latestVideo);
      renderMoreVideos(root, []);
    });
}
