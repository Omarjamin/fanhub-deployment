import "../../../styles/Admin_styles/Header.css";
import { getAdminHeaders } from "./admin-sites.js";

const API_BASE = (import.meta.env.VITE_API_URL || "https://fanhub-deployment-production.up.railway.app/v1").trim().replace(/\/$/, "");
const POLL_MS = 15000;
const READ_STORE_KEY = "admin_report_notif_reads_v1";

function buildApiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getAuthHeaders() {
  return {
    ...getAdminHeaders(),
    "Content-Type": "application/json",
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function normalizeStatus(raw) {
  const status = String(raw || "pending").toLowerCase();
  return status === "resolved" ? "resolved" : "pending";
}

function getReasonTokens(row) {
  const raw =
    row?.reasons ??
    row?.reason ??
    row?.report_reasons ??
    row?.report_reason ??
    row?.latest_reason ??
    "";

  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return String(raw).split(",").map((x) => x.trim()).filter(Boolean);
}

function normalizeRows(rows, source) {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => {
    const latest = row.latest_report || row.created_at || new Date().toISOString();
    const reasons = getReasonTokens(row);

    if (source === "post") {
      const postId = row.post_id || null;
      return {
        key: `post-${postId || row.user_id || "na"}`,
        source,
        title: row.fullname || "Reported post",
        subtitle: row.email || `Post #${postId || "N/A"}`,
        status: normalizeStatus(row.latest_status || row.status),
        time: latest,
        reasons,
        detailPath: postId ? `/admin/reports/posts/${postId}/reports` : null,
        target: postId ? `/subadmin/reports?source=post&postId=${encodeURIComponent(postId)}` : "/subadmin/reports",
      };
    }

    const userId = row.user_id || row.reported_user_id || null;
    return {
      key: `message-${userId || "na"}`,
      source,
      title: row.fullname || "Reported user",
      subtitle: row.email || `User #${userId || "N/A"}`,
      status: normalizeStatus(row.latest_status || row.status),
      time: latest,
      reasons,
      detailPath: userId ? `/admin/reports/users/${userId}/reports` : null,
      target: userId ? `/subadmin/reports?source=message&userId=${encodeURIComponent(userId)}` : "/subadmin/reports",
    };
  });
}

function normalizeSuggestionRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => {
    const createdAt = row?.created_at || new Date().toISOString();
    const suggestionId = Number(row?.suggestion_id || 0);
    const communityName = String(row?.community_name || "Community suggestion").trim();
    const suggestionText = String(row?.suggestion_text || "").trim();
    const email = String(row?.contact_email || "").trim();

    return {
      key: `suggestion-${suggestionId || "na"}`,
      source: "suggestion",
      kind: "suggestion",
      suggestionId,
      readKey: `suggestion-${suggestionId || "na"}:${new Date(createdAt).toISOString()}`,
      title: communityName || "Community suggestion",
      subtitle: email || "Suggestion form submission",
      status: "pending",
      time: createdAt,
      reasons: suggestionText ? [suggestionText] : [],
      detailPath: null,
      target: null,
      read: false,
    };
  });
}

function loadReadMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(READ_STORE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveReadMap(map) {
  try {
    localStorage.setItem(READ_STORE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getReadKey(item) {
  return `${item.key}:${new Date(item.time).toISOString()}`;
}

function renderNotifItems(items) {
  const visibleItems = (items || []).filter((item) => !item.read && item.status !== "resolved");
  if (!visibleItems.length) return `<p class="notif-empty">No new notifications.</p>`;

  return visibleItems
    .map((item) => {
      const reasonsHtml = item.reasons.length
        ? `<div class="notif-item-bottom">${item.reasons
            .map((reason) => `<span class="notif-chip">${escapeHtml(reason)}</span>`)
            .join("")}</div>`
        : "";

      const sourceLabel =
        item.source === "post"
          ? "Post report"
          : item.source === "message"
            ? "Message report"
            : "Suggestion";

      return `
        <article class="notif-item ${item.read ? "is-read" : "is-unread"}" data-read-key="${escapeHtml(
          item.readKey
        )}" data-target="${escapeHtml(item.target || "")}" data-kind="${escapeHtml(item.kind || "report")}" data-suggestion-id="${escapeHtml(
          item.suggestionId || ""
        )}" style="cursor:pointer;">
          <div class="notif-item-top">
            <div class="notif-name">${escapeHtml(item.title)}</div>
            <div class="notif-time">${escapeHtml(toRelativeTime(item.time))}</div>
          </div>
          <div class="notif-item-meta">
            <span>${escapeHtml(sourceLabel)}</span>
            <span>${escapeHtml(item.subtitle)}</span>
          </div>
          ${reasonsHtml}
        </article>
      `;
    })
    .join("");
}

export default function Header(root) {
  root.classList.add("admin-header");
  root.innerHTML = `
    <div class="header-left">
      <h1 id="pageTitle">Admin Panel</h1>
    </div>
    <div class="header-right">
      <div class="notif-wrap">
        <button type="button" class="notif-button" id="adminNotifBtn" aria-label="Notifications">
          <span class="notif-icon" aria-hidden="true">&#128276;</span>
          <span class="notif-label">Notifications</span>
          <span class="notif-badge hidden" id="adminNotifBadge">0</span>
        </button>
        <div class="notif-modal hidden" id="adminNotifModal">
          <div class="notif-modal-header" style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Notifications</strong>
            <button type="button" id="markAllNotifReadBtn" style="border:0;background:none;color:#0f766e;cursor:pointer;font-weight:600;">Mark all read</button>
          </div>
          <div class="notif-modal-body" id="adminNotifModalBody"></div>
          <div class="notif-modal-header">
            <a href="/subadmin/reports" data-link style="font-size:0.85rem; color:#0f766e; text-decoration:none;">Open Report Management</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const notifBtn = root.querySelector("#adminNotifBtn");
  const notifBadge = root.querySelector("#adminNotifBadge");
  const notifModal = root.querySelector("#adminNotifModal");
  const notifModalBody = root.querySelector("#adminNotifModalBody");
  const markAllReadBtn = root.querySelector("#markAllNotifReadBtn");

  let notifItems = [];
  let pollId = null;
  const reasonCache = new Map();
  let readMap = loadReadMap();

  function updateBadge() {
    const unreadCount = notifItems.filter((item) => !item.read && item.status !== "resolved").length;
    if (unreadCount > 0) {
      notifBadge.textContent = String(unreadCount);
      notifBadge.classList.remove("hidden");
    } else {
      notifBadge.textContent = "0";
      notifBadge.classList.add("hidden");
    }
  }

  function applyReadState(items) {
    return items.map((item) => {
      const readKey = getReadKey(item);
      return { ...item, readKey, read: Boolean(readMap[readKey]) };
    });
  }

  function renderModal() {
    notifModalBody.innerHTML = renderNotifItems(notifItems);
  }

  function markAsRead(readKey) {
    if (!readKey) return;
    readMap[readKey] = true;
    saveReadMap(readMap);
    notifItems = notifItems.filter((item) => item.readKey !== readKey);
    updateBadge();
    renderModal();
  }

  async function markSuggestionAsRead(suggestionId) {
    const id = Number(suggestionId);
    if (!Number.isFinite(id) || id <= 0) return false;
    try {
      const res = await fetch(buildApiUrl(`/admin/suggestions/${id}/read`), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      return Boolean(res.ok && payload?.success !== false);
    } catch (error) {
      console.warn("Failed to mark suggestion read:", error);
      return false;
    }
  }

  async function markAllSuggestionsRead() {
    try {
      await fetch(buildApiUrl("/admin/suggestions/read-all"), {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.warn("Failed to mark all suggestions read:", error);
    }
  }

  async function markAllAsRead() {
    notifItems.forEach((item) => {
      if (item.kind === "suggestion") return;
      readMap[item.readKey] = true;
    });
    saveReadMap(readMap);
    await markAllSuggestionsRead();
    notifItems = [];
    updateBadge();
    renderModal();
  }

  async function hydrateMissingReasons(items) {
    const nextItems = [...items];
    const tasks = nextItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (!item.reasons || !item.reasons.length) && item.detailPath)
      .map(async ({ item, index }) => {
        try {
          const cached = reasonCache.get(item.detailPath);
          if (cached?.length) {
            nextItems[index] = { ...item, reasons: cached };
            return;
          }
          const res = await fetch(buildApiUrl(item.detailPath), { method: "GET", headers: getAuthHeaders() });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok || payload?.success === false) return;

          const rows = Array.isArray(payload?.data) ? payload.data : [];
          const reasons = Array.from(new Set(rows.flatMap((row) => getReasonTokens(row)).filter(Boolean)));
          if (reasons.length) {
            reasonCache.set(item.detailPath, reasons);
            nextItems[index] = { ...item, reasons };
          }
        } catch (error) {
          console.warn("Failed to hydrate report reasons for notification:", error);
        }
      });

    await Promise.all(tasks);
    return nextItems;
  }

  async function fetchNotifications() {
    try {
      const [usersRes, postsRes, suggestionsRes] = await Promise.allSettled([
        fetch(buildApiUrl("/admin/reports/users/reported"), { method: "GET", headers: getAuthHeaders() }),
        fetch(buildApiUrl("/admin/reports/posts/reported"), { method: "GET", headers: getAuthHeaders() }),
        fetch(buildApiUrl("/admin/suggestions/notifications"), { method: "GET", headers: getAuthHeaders() }),
      ]);

      const usersStatus = usersRes.status === "fulfilled" ? usersRes.value.status : 0;
      const postsStatus = postsRes.status === "fulfilled" ? postsRes.value.status : 0;
      if (usersStatus === 401 && postsStatus === 401) {
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
        console.warn("[Header] Stopped report polling due to 401 (admin session expired).");
        notifItems = [];
        updateBadge();
        renderModal();
        return;
      }

      const usersPayload = usersRes.status === "fulfilled" ? await usersRes.value.json().catch(() => ({})) : {};
      const postsPayload = postsRes.status === "fulfilled" ? await postsRes.value.json().catch(() => ({})) : {};
      const suggestionsPayload =
        suggestionsRes.status === "fulfilled" ? await suggestionsRes.value.json().catch(() => ({})) : {};

      const userRows =
        usersRes.status === "fulfilled" && usersRes.value.ok && usersPayload?.success !== false ? usersPayload.data || [] : [];
      const postRows =
        postsRes.status === "fulfilled" && postsRes.value.ok && postsPayload?.success !== false ? postsPayload.data || [] : [];
      const suggestionRows =
        suggestionsRes.status === "fulfilled" && suggestionsRes.value.ok && suggestionsPayload?.success !== false
          ? suggestionsPayload.data || []
          : [];

      const reportItems = [...normalizeRows(userRows, "message"), ...normalizeRows(postRows, "post")];
      const hydratedReports = applyReadState(await hydrateMissingReasons(reportItems));
      const suggestionItems = normalizeSuggestionRows(suggestionRows);
      const merged = [...hydratedReports, ...suggestionItems].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      notifItems = merged;
      updateBadge();
      renderModal();
    } catch (error) {
      console.error("Failed to load admin report notifications:", error);
    }
  }

  function toggleModal(forceOpen) {
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : notifModal.classList.contains("hidden");
    notifModal.classList.toggle("hidden", !shouldOpen);
  }

  notifBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleModal();
  });

  markAllReadBtn.addEventListener("click", async (event) => {
    event.stopPropagation();
    await markAllAsRead();
  });

  notifModalBody.addEventListener("click", async (event) => {
    const card = event.target.closest(".notif-item[data-read-key][data-target]");
    if (!card) return;
    const readKey = card.getAttribute("data-read-key");
    const kind = card.getAttribute("data-kind") || "report";
    const suggestionId = card.getAttribute("data-suggestion-id");
    const target = card.getAttribute("data-target") || "/subadmin/reports";

    if (kind === "suggestion") {
      const ok = await markSuggestionAsRead(suggestionId);
      if (ok) {
        notifItems = notifItems.filter((item) => String(item.suggestionId || "") !== String(suggestionId || ""));
        updateBadge();
        renderModal();
      }
      return;
    }

    markAsRead(readKey);
    if (target) {
      window.location.href = target;
    }
  });

  document.addEventListener("click", (event) => {
    if (!root.isConnected) return;
    if (!notifModal.contains(event.target) && !notifBtn.contains(event.target)) {
      toggleModal(false);
    }
  });

  pollId = setInterval(() => {
    if (!root.isConnected) {
      clearInterval(pollId);
      return;
    }
    fetchNotifications();
  }, POLL_MS);

  fetchNotifications();
}



