import { io } from "socket.io-client";

const API_URL = "https://fanhub-deployment-production.up.railway.app";

let socket = null;

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function resolveUserId(token) {
  const localUserId =
    sessionStorage.getItem("userId") ||
    sessionStorage.getItem("currentUserId") ||
    sessionStorage.getItem("user_id");

  if (localUserId) return localUserId;

  const payload = parseJwtPayload(token);
  const fromToken = payload?.id || payload?.user_id || payload?.sub;
  if (fromToken) {
    localStorage.setItem("userId", String(fromToken));
    return String(fromToken);
  }

  return null;
}

const setupSocket = () => {
  const currentToken = sessionStorage.getItem("authToken");
  if (!currentToken) {
    if (socket?.connected) socket.disconnect();
    return null;
  }

  const userId = resolveUserId(currentToken);
  if (!userId) {
    // Missing user id is valid before first authenticated profile bootstrap; keep silent.
    return null;
  }

  if (!socket) {
    socket = io(API_URL, {
      auth: { token: currentToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
  } else {
    socket.auth = { ...(socket.auth || {}), token: currentToken };
  }

  socket.off("connect");
  socket.off("connect_error");
  socket.off("online_users_list");
  socket.off("user_status");
  socket.off("disconnect");

  socket.on("connect", () => {
    const currentUserId = resolveUserId(currentToken);
    if (currentUserId) {
      socket.emit("join_room", currentUserId);
      socket.emit("request_online_users");
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server");
  });

  socket.on("online_users_list", ({ users }) => {
    window.dispatchEvent(new CustomEvent("onlineUsersList", { detail: { users } }));
  });

  socket.on("user_status", ({ id, status }) => {
    window.dispatchEvent(new CustomEvent("userStatusUpdate", { detail: { id, status } }));
  });

  if (!socket.connected) {
    socket.connect();
  }

  window.socket = socket;
  return socket;
};

export { socket, setupSocket };


