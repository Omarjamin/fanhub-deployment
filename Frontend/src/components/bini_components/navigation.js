import MessagingModal from "./messages/MessagingModal";
import "../../styles/bini_styles/navigation.css";
import { getActiveSiteSlug, setActiveSiteSlug } from "../../lib/site-context.js";
import { isTemplatePreviewMode } from "../../lib/template-preview.js";

const DEFAULT_NAV_LOGO = "/bini_logo.jpg";

function resolveCommunityType(data = {}) {
  const fromData = String(
    data?.community_type ||
    data?.communityType ||
    data?.siteSlug ||
    data?.siteData?.community_type ||
    data?.siteData?.site_slug ||
    data?.siteData?.domain ||
    ""
  ).trim().toLowerCase();
  if (fromData) return fromData;

  const fromStorage = String(
    sessionStorage.getItem("community_type") || "",
  ).trim().toLowerCase();
  if (fromStorage) return fromStorage;

  const pathParts = String(window.location.pathname || "").split("/").filter(Boolean);
  // /fanhub/community-platform/:community/...
  if (pathParts[0] === "fanhub" && pathParts[1] === "community-platform" && pathParts[2]) {
    return String(pathParts[2]).trim().toLowerCase();
  }

  return "";
}

function resolveLogoUrl(data = {}) {
  const previewMode = isTemplatePreviewMode(data);
  const raw = String(
    data?.logo ||
      data?.siteData?.logo ||
      data?.site_data?.logo ||
      data?.siteData?.logo_url ||
      data?.site_data?.logo_url ||
      data?.communityData?.logo ||
      data?.community_data?.logo ||
      data?.communityData?.logo_url ||
      data?.community_data?.logo_url ||
      (!previewMode ? (sessionStorage.getItem("community_logo") || localStorage.getItem("community_logo") || "") : "") ||
      "",
  ).trim();

  if (!raw) return DEFAULT_NAV_LOGO;
  let normalized = raw;
  if (raw.startsWith("//")) {
    normalized = `${window.location.protocol}${raw}`;
  } else if (!( /^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/") )) {
    normalized = `/${raw.replace(/^\.?\//, "")}`;
  }

  if (normalized && normalized !== DEFAULT_NAV_LOGO) {
    sessionStorage.setItem("community_logo", normalized);
    localStorage.setItem("community_logo", normalized);
  }

  return normalized;
}

window.updateNavMessageBadge = function (count = 0) {
  const chatBtn = document.querySelector("#newPostNavBtn");
  if (!chatBtn) return;

  let badge = chatBtn.querySelector(".msg-badge");
  if (count > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "msg-badge";
      chatBtn.style.position = "relative";
      chatBtn.appendChild(badge);
    }
  } else {
    badge?.remove();
  }
  sessionStorage.setItem("unreadCount", count);
};

window.addEventListener("DOMContentLoaded", () => {
  const saved = parseInt(sessionStorage.getItem("unreadCount") || "0", 10);
  window.updateNavMessageBadge(saved);

  if (window.socket) {
    window.socket.on("unread_count_update", ({ unread_count }) => {
      window.updateNavMessageBadge(unread_count);
    });
  }
});

export default function Navigation(root, data = {}) {
  const previewMode = isTemplatePreviewMode(data);
  const communityType = resolveCommunityType(data);
  const navLogo = resolveLogoUrl(data);
  if (communityType) {
    setActiveSiteSlug(communityType);
  }

  const syncCommunityLayoutClass = () => {
    const isDesktopSideNav = window.matchMedia("(min-width: 1025px)").matches;
    document.body.classList.toggle("has-community-side-nav", isDesktopSideNav);
  };
  syncCommunityLayoutClass();
  if (!previewMode) {
    window.addEventListener("resize", syncCommunityLayoutClass);
  }

  const basePath = communityType
    ? `/fanhub/community-platform/${encodeURIComponent(communityType)}`
    : "/bini";
  const homePath = basePath;
  const searchPath = `${basePath}/search`;
  const notificationsPath = `${basePath}/notifications`;
  const profilePath = `${basePath}/profile`;
  const backPath = communityType ? `/fanhub/${encodeURIComponent(communityType)}` : "/";

  root.innerHTML = `
    <nav class="bottom-nav">
      <div class="nav-logo">
        <a href="${homePath}" class="nav-logo-link" aria-label="Go to home">
          <img src="${navLogo}" class="nav-logo-img" onerror="this.onerror=null;this.src='${DEFAULT_NAV_LOGO}';">
        </a>
      </div>
      <div class="nav-links">
        <a href="${homePath}" id="homecon" class="nav-item">
          <img src="/home-heart.png" alt="Home" class="nav-icon" onerror="this.style.display='none';">
          <span class="nav-text">Home</span>
        </a>
        <a href="${searchPath}" class="nav-item" id="searchcon">
          <img src="/search-heart.png" alt="Search" class="nav-icon" onerror="this.style.display='none';">
          <span class="nav-text">Search</span>
        </a>
        <a href="#" class="nav-item" id="newPostNavBtn">
          <img src="/messenger.png" alt="Messages" class="nav-icon" onerror="this.style.display='none';">
          <span class="nav-text">Messages</span>
        </a>
        <a href="${notificationsPath}" class="nav-item" id="notifcon">
          <img src="/circle-heart.png" alt="Notifications" class="nav-icon" onerror="this.style.display='none';">
          <span class="nav-text">Notifications</span>
        </a>
        <a href="${profilePath}" class="nav-item" id="profilecon">
          <img src="/circle-user.png" alt="Profile" class="nav-icon" onerror="this.style.display='none';">
          <span class="nav-text">Profile</span>
        </a>
        <a href="${backPath}" class="nav-item" id="backBtn">
          <img src="/box-arrow-left.svg" alt="Back to Shop" class="nav-icon" onerror="this.style.display='none';">
          <span class="nav-text">Back</span>
        </a>
      </div>
    </nav>
  `;

  const path = window.location.pathname;
  const isHome = path === homePath || path === `${homePath}/` || path === "/bini" || path === "/bini/";
  const isSearch = path.startsWith(`${basePath}/search`) || path.startsWith("/bini/search");
  const isProfile = path.startsWith(`${basePath}/profile`) || path.startsWith("/bini/profile");
  const isNotif = path.startsWith(`${basePath}/notifications`) || path.startsWith("/bini/notifications");

  if (isHome) root.querySelector("#homecon")?.classList.add("active");
  if (isSearch) root.querySelector("#searchcon")?.classList.add("active");
  if (isProfile) root.querySelector("#profilecon")?.classList.add("active");
  if (isNotif) root.querySelector("#notifcon")?.classList.add("active");

  if (!document.getElementById("community-nav-active-style")) {
    const style = document.createElement("style");
    style.id = "community-nav-active-style";
    style.innerHTML = `
      .nav-item.active img {
        filter: brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(748%) hue-rotate(170deg) brightness(101%) contrast(101%);
        border-radius: 8px;
        transition: filter 0.2s, border-bottom 0.2s;
      }
    `;
    document.head.appendChild(style);
  }

  if (previewMode) {
    return;
  }

  const chatBtn = root.querySelector("#newPostNavBtn");
  if (chatBtn) {
    let messagingModal = null;

    chatBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!messagingModal || !messagingModal.modal) {
        messagingModal = new MessagingModal();
        await messagingModal.show();
        return;
      }

      messagingModal.close();
      messagingModal = null;
    });

    window.addEventListener("beforeunload", () => {
      if (messagingModal) messagingModal.close();
    });
  }
}
