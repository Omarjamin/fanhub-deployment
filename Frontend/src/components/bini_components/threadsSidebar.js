import fetchThreads from "../../services/bini_services/thread/thread-api.js";
import { formatUserTimestamp } from "../../utils/user-time.js";
import { getActiveSiteSlug } from "../../lib/site-context.js";

function formatThreadDate(value) {
  return formatUserTimestamp(value) || "No date";
}

export async function renderThreadsSidebar() {
  const threads = await fetchThreads();

  const html = `
    <div class="threads-sidebar">
      <button class="events-panel-close" aria-label="Close threads panel">×</button>
      <h3 class="threads-header">Community Threads</h3>

      <ul class="threads-list">
        ${threads
          ?.map(
            (thread) => `
          <li
            class="thread-item ${thread.isPinned ? "pinned" : ""}"
            data-thread-id="${thread.id}"
            style="cursor: pointer;"
          >
            <div class="thread-item-meta">
              <div class="thread-date">${formatThreadDate(thread.date || thread.created_at)}</div>
              ${thread.isPinned ? '<span class="thread-pin-tag">Pinned</span>' : ""}
            </div>
            <div class="thread-title">${thread.title || "Untitled thread"}</div>
            <div class="thread-venue">${thread.venue || "No venue"}</div>
          </li>
        `,
          )
          .join("")}
      </ul>
    </div>
  `;

  return {
    html,
    setupClickHandlers: (container) => {
      const threadItems = container.querySelectorAll(".thread-item");
      threadItems.forEach((item) => {
        item.addEventListener("click", () => {
          const threadId = item.dataset.threadId;
          if (threadId) {
            const pathParts = String(window.location.pathname || "")
              .split("/")
              .filter(Boolean);
            const activeSlug = String(getActiveSiteSlug() || "").trim().toLowerCase();
            const routeSlug =
              pathParts[0] === "fanhub" &&
              pathParts[1] === "community-platform" &&
              pathParts[2]
                ? pathParts[2]
                : activeSlug;
            const targetPath = routeSlug
              ? `/fanhub/community-platform/${encodeURIComponent(routeSlug)}/thread/${threadId}`
              : `/bini/thread/${threadId}`;
            window.history.pushState({}, "", targetPath);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        });
      });
    },
  };
}
