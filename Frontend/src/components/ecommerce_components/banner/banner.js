const FALLBACK_VIDEO = {
  videoId: 'wufUX5P2Ds8',
  title: 'Cherry On Top',
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

function getEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0`;
}

function normalizeVideo(video = {}) {
  const videoId = String(video?.videoId || video?.id || '').trim();
  if (!videoId) return null;

  return {
    videoId,
    title: String(video?.title || 'Latest Release').trim(),
    url: getVideoUrl(video),
  };
}

function updateBannerVideo(root, video) {
  const iframe = root.querySelector('#bannerIframe');
  const button = root.querySelector('#watchLatestBtn');

  if (iframe) {
    iframe.src = getEmbedUrl(video.videoId);
    iframe.title = video.title;
  }

  if (button) {
    button.disabled = false;
    button.dataset.videoUrl = video.url;
    button.textContent = 'Watch on YouTube';
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
      <div class="banner-video-wrap">
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
          Watch on YouTube
        </button>
      </div>
    </section>
  `;

  const section = root.querySelector('#home.banner');
  if (!section) return;

  section.addEventListener('click', (event) => {
    const watchButton = event.target.closest('#watchLatestBtn');
    if (!watchButton) return;

    const url = String(watchButton.dataset.videoUrl || '').trim();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
    })
    .catch((error) => {
      console.error('Using fallback video due to API error:', {
        endpoint,
        message: error?.message || String(error),
      });
      updateBannerVideo(root, latestVideo);
    });
}
