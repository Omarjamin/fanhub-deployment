import { getActiveSiteSlug, getSessionToken, getSiteHeaders } from '../../../lib/site-context.js';

function parseYear(value) {
  if (!value) return "Unknown";
  if (/^\d{4}$/.test(String(value))) return String(value);
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return String(d.getFullYear());
  return String(value).slice(0, 4);
}

function normalizeAlbumLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(raw)) return `https://${raw}`;
  return "";
}

function normalizeAlbums(payload) {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.albums)
      ? payload.albums
      : Array.isArray(payload)
        ? payload
        : [];

  return rows.map((a) => ({
    album_id: a?.album_id || a?.id || "",
    title: a?.title || "Untitled",
    description: a?.description || a?.album_description || "Album",
    year: parseYear(a?.year),
    count_songs: Number(a?.count_songs ?? a?.songs ?? 0),
    cover_image: a?.cover_image || a?.img_url || "https://via.placeholder.com/320x320?text=Album",
    album_link: normalizeAlbumLink(a?.album_link),
  }));
}

export default function Discography(root) {
  root.querySelectorAll(".discography-section").forEach((node) => node.remove());

  root.insertAdjacentHTML(
    "beforeend",
    `
    <section id="music" class="discography-section">
      <h2 class="section-title">Discography</h2>
      <div class="album-carousel">
        <button class="carousel-btn prev" type="button" aria-label="Previous album">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="album-container"></div>
        <button class="carousel-btn next" type="button" aria-label="Next album">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </section>
    `,
  );

  const sections = root.querySelectorAll(".discography-section");
  const section = sections[sections.length - 1];
  const container = section?.querySelector(".album-container");
  const nextBtn = section?.querySelector(".carousel-btn.next");
  const prevBtn = section?.querySelector(".carousel-btn.prev");
  const carousel = section?.querySelector(".album-carousel");

  if (!section || !container || !nextBtn || !prevBtn || !carousel) {
    console.error("Discography mount failed", {
      section: Boolean(section),
      container: Boolean(container),
      nextBtn: Boolean(nextBtn),
      prevBtn: Boolean(prevBtn),
      carousel: Boolean(carousel),
    });
    return;
  }

  let currentAlbum = 0;
  let albumInterval = null;
  let albums = [];

  function resolveUI() {
    const liveSection =
      root.querySelector("#music.discography-section") ||
      root.querySelector(".discography-section") ||
      section;
    const liveContainer = liveSection?.querySelector(".album-container") || container;
    const livePrevBtn = liveSection?.querySelector(".carousel-btn.prev") || prevBtn;
    const liveNextBtn = liveSection?.querySelector(".carousel-btn.next") || nextBtn;
    return { liveSection, liveContainer, livePrevBtn, liveNextBtn };
  }

  function renderMessage(title, msg) {
    const { liveContainer, livePrevBtn, liveNextBtn } = resolveUI();
    if (!liveContainer || !livePrevBtn || !liveNextBtn) return;
    livePrevBtn.style.display = "none";
    liveNextBtn.style.display = "none";
    liveContainer.innerHTML = `
      <div class="album-card active" style="opacity:1;z-index:3;transform:translate(-50%, -50%) translateX(0) scale(1);pointer-events:auto;">
        <div>
          <h3>${title}</h3>
          <p>${msg}</p>
        </div>
      </div>
    `;
    albums = Array.from(liveContainer.querySelectorAll(".album-card"));
  }

  function updateAlbumPositions() {
    const len = albums.length;
    if (!len) return;

    albums.forEach((album, index) => {
      const nextIndex = (currentAlbum + 1) % len;
      const prevIndex = (currentAlbum - 1 + len) % len;

      album.classList.remove("active");
      album.style.pointerEvents = "none";

      if (index === currentAlbum) {
        album.style.transform = "translate(-50%, -50%) translateX(0) scale(1)";
        album.style.opacity = "1";
        album.style.zIndex = "3";
        album.classList.add("active");
        album.style.pointerEvents = "auto";
      } else if (index === nextIndex) {
        album.style.transform = "translate(-50%, -50%) translateX(120%) scale(0.85)";
        album.style.opacity = "0.6";
        album.style.zIndex = "2";
      } else if (index === prevIndex) {
        album.style.transform = "translate(-50%, -50%) translateX(-120%) scale(0.85)";
        album.style.opacity = "0.6";
        album.style.zIndex = "2";
      } else {
        album.style.transform = "translate(-50%, -50%) translateX(0) scale(0.7)";
        album.style.opacity = "0";
        album.style.zIndex = "1";
      }

      album.style.transition = "transform 0.45s ease, opacity 0.45s ease";
    });
  }

  function showAlbum(n) {
    if (!albums.length) return;
    currentAlbum = (n + albums.length) % albums.length;
    updateAlbumPositions();
  }

  function nextAlbum() {
    showAlbum(currentAlbum + 1);
  }

  function prevAlbum() {
    showAlbum(currentAlbum - 1);
  }

  function startAutoCarousel() {
    if (albums.length <= 1) return;
    stopAutoCarousel();
    albumInterval = setInterval(nextAlbum, 3000);
  }

  function stopAutoCarousel() {
    if (albumInterval) {
      clearInterval(albumInterval);
      albumInterval = null;
    }
  }

  function renderAlbums(list) {
    const { liveContainer, livePrevBtn, liveNextBtn } = resolveUI();
    if (!liveContainer || !livePrevBtn || !liveNextBtn) return;

    if (!list.length) {
      renderMessage("No albums yet", "Add discography rows in database to display albums.");
      return;
    }

    livePrevBtn.style.display = list.length > 1 ? "flex" : "none";
    liveNextBtn.style.display = list.length > 1 ? "flex" : "none";

    liveContainer.innerHTML = list
      .map(
        (album, idx) => `
        <div class="album-card ${idx === 0 ? "active" : ""}" data-album-id="${album.album_id}">
          ${
            album.album_link
              ? `<a href="${album.album_link}" target="_blank" rel="noopener noreferrer">`
              : `<div class="album-link-disabled">`
          }
            <img src="${album.cover_image}" alt="${album.title}">
            <h3>${album.title}</h3>
            <p>${album.description} - ${album.year} - ${album.count_songs} Songs</p>
          ${
            album.album_link
              ? `</a>`
              : `</div>`
          }
        </div>
      `,
      )
      .join("");

    albums = Array.from(liveContainer.querySelectorAll(".album-card"));
    showAlbum(0);
    startAutoCarousel();
  }

  async function fetchAlbums() {
    let settled = false;
    const watchdog = setTimeout(() => {
      if (settled) return;
      renderMessage(
        "Failed to load albums",
        "Request took too long. Please check backend server and try refreshing.",
      );
    }, 15000);

    try {
      const baseApi = import.meta.env.VITE_API_URL || "http://localhost:4000/v1";
      const apiKey = import.meta.env.VITE_API_KEY || "thread";
      const siteSlug = getActiveSiteSlug();
      const token = getSessionToken(siteSlug);
      const controller = new AbortController();
      const timeoutMs = 12000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${baseApi}/ecommerce/discography/albums`, {
        headers: {
          apikey: apiKey,
          ...getSiteHeaders(siteSlug),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `Discography API failed (${response.status})`);
      }

      const apiAlbums = normalizeAlbums(payload);
      console.log("Discography API payload:", payload);
      console.log("Discography normalized:", apiAlbums);
      settled = true;
      renderAlbums(apiAlbums);
    } catch (error) {
      console.error("Discography fetch failed:", error);
      const message =
        error?.name === "AbortError"
          ? "Request timed out. Check backend server and site DB mapping."
          : (error?.message || "Please try again.");
      settled = true;
      renderMessage("Failed to load albums", message);
    } finally {
      clearTimeout(watchdog);
    }
  }

  nextBtn.addEventListener("click", () => {
    nextAlbum();
    stopAutoCarousel();
  });
  prevBtn.addEventListener("click", () => {
    prevAlbum();
    stopAutoCarousel();
  });
  carousel.addEventListener("mouseenter", stopAutoCarousel);
  carousel.addEventListener("mouseleave", startAutoCarousel);

  renderMessage("Loading albums (v2)...", "Please wait while discography is loading.");
  fetchAlbums().catch((error) => {
    console.error("Discography unexpected failure:", error);
    renderMessage("Failed to load albums", error?.message || "Unexpected error");
  });

  // Absolute fallback: if UI is still in loading state after 8s, force message update.
  setTimeout(() => {
    const { liveContainer } = resolveUI();
    const text = String(liveContainer?.textContent || "");
    if (!text.includes("Loading albums")) return;
    renderMessage(
      "Failed to load albums",
      "Discography is still loading. Please refresh and check backend logs.",
    );
  }, 8000);
}
