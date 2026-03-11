export default function setupThreadsFab() {
  const ensureThreadsFab = () => {
    let fab = document.getElementById("threads-fab");
    if (!fab) {
      fab = document.createElement("button");
      fab.id = "threads-fab";
      fab.className = "threads-fab";
      fab.type = "button";
      fab.setAttribute("aria-label", "Open community threads");
      fab.setAttribute("aria-expanded", "false");
      fab.innerHTML = `<span class="threads-fab-icon" aria-hidden="true">📣</span>`;
      document.body.appendChild(fab);
    }
    return fab;
  };

  const ensureThreadsBackdrop = () => {
    let backdrop = document.getElementById("threads-sheet-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "threads-sheet-backdrop";
      backdrop.className = "threads-sheet-backdrop";
      document.body.appendChild(backdrop);
    }
    return backdrop;
  };

  const closeThreadsSheet = () => {
    const homepageRight = document.querySelector(".homepage-right");
    const fab = document.getElementById("threads-fab");
    if (homepageRight) homepageRight.classList.remove("events-visible");
    document.body.classList.remove("threads-sheet-open");
    if (fab) fab.setAttribute("aria-expanded", "false");
  };

  const openThreadsSheet = () => {
    const homepageRight = document.querySelector(".homepage-right");
    const fab = document.getElementById("threads-fab");
    if (!homepageRight) return;
    homepageRight.classList.add("events-visible");
    document.body.classList.add("threads-sheet-open");
    if (fab) fab.setAttribute("aria-expanded", "true");
  };

  const toggleThreadsSheet = () => {
    const homepageRight = document.querySelector(".homepage-right");
    if (!homepageRight) return;
    const isVisible = homepageRight.classList.contains("events-visible");
    if (isVisible) closeThreadsSheet();
    else openThreadsSheet();
  };

  const fab = ensureThreadsFab();
  const backdrop = ensureThreadsBackdrop();

  if (!window.__threadsFabBound) {
    window.__threadsFabBound = true;

    fab.addEventListener("click", (event) => {
      event.preventDefault();
      toggleThreadsSheet();
    });

    backdrop.addEventListener("click", () => {
      closeThreadsSheet();
    });

    document.addEventListener("click", (event) => {
      const closeBtn = event.target.closest(".events-panel-close");
      if (closeBtn) {
        closeThreadsSheet();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeThreadsSheet();
      }
    });

    window.addEventListener("popstate", () => {
      closeThreadsSheet();
    });
  }

  return { openThreadsSheet, closeThreadsSheet, toggleThreadsSheet, fab, backdrop };
}
