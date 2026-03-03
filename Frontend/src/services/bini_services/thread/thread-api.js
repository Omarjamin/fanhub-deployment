import api from "../api.js";

const BASE_V1 = import.meta.env.VITE_API_URL || "http://localhost:4000/v1";

function normalizeThread(raw) {
  const isPinned = Boolean(raw?.isPinned ?? raw?.is_pinned ?? raw?.pinned ?? false);

  return {
    id: raw?.id,
    title: raw?.title || "Untitled thread",
    date: raw?.date || "",
    venue: raw?.venue || "",
    author: raw?.author || "Admin",
    commentCount: raw?.commentCount || 0,
    created_at: raw?.created_at || raw?.createdAt || null,
    isPinned,
    is_pinned: isPinned,
  };
}

function sortThreads(threads) {
  return [...threads].sort((a, b) => {
    const pinA = a.isPinned ? 1 : 0;
    const pinB = b.isPinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const aTime = new Date(a.created_at || a.date || 0).getTime() || 0;
    const bTime = new Date(b.created_at || b.date || 0).getTime() || 0;
    return bTime - aTime;
  });
}

export async function fetchThreads() {
  try {
    const response = await api.get(`${BASE_V1}/bini/posts/threads`);
    const data = response.data;

    const rawThreads = Array.isArray(data)
      ? data
      : Array.isArray(data?.threads)
        ? data.threads
        : [];

    return sortThreads(rawThreads.map(normalizeThread));
  } catch (error) {
    console.error("Error fetching threads:", error);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Body:", error.response.data);
    }

    return sortThreads(getMockThreads().map(normalizeThread));
  }
}

function getMockThreads() {
  return [
    {
      id: 1,
      title: 'Cloudstaff "ROAR" Year-end Party 2025',
      date: "December 6, 2025",
      venue: "Philippine Arena",
      author: "Admin",
      commentCount: 0,
      isPinned: true,
    },
    {
      id: 2,
      title: "BINI Cosmetics Livestream",
      date: "December 10, 2025",
      venue: "BINI.Global Livestream",
      author: "Admin",
      commentCount: 0,
      isPinned: true,
    },
    {
      id: 3,
      title: "Enervon Z+ X BINI",
      date: "December 11, 2025",
      venue: "Livestream",
      author: "Admin",
      commentCount: 0,
      isPinned: false,
    },
  ];
}

export default fetchThreads;




