import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import v1 from "./Routers/index.js";
import MessageModel from "./Models/bini_models/MessageModel.js";
import "./core/database.js";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import { connect } from "./core/database.js";
import attachGlobalSiteScope from "./Middlewares/site-scope.js";

dotenv.config();
if (process.env.ALLOW_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("Insecure TLS mode enabled (ALLOW_INSECURE_TLS=1).");
}

// Global handlers to log uncaught errors (prevents silent crashes during development)
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = "0.0.0.0";

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Online presence tracker: userId -> Set(socketId)
const onlineUsers = new Map();

function normalizeCommunityType(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function resolveSocketUserId(socket = {}) {
  const user = socket?.user || {};
  const resolved = user?.id ?? user?.user_id ?? user?.userId ?? user?.sub ?? null;
  if (resolved === null || resolved === undefined || resolved === "") return null;
  return String(resolved);
}

function addOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineSocket(userId, socketId) {
  const socketSet = onlineUsers.get(userId);
  if (!socketSet) return false;
  socketSet.delete(socketId);
  if (socketSet.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  return false;
}

function getOnlineUserIds() {
  return Array.from(onlineUsers.entries())
    .filter(([, socketSet]) => socketSet && socketSet.size > 0)
    .map(([id]) => id);
}

// Middleware to attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Sanitize incoming Authorization header to avoid invalid character crashes
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && /[\r\n]/.test(auth)) {
    console.warn("Sanitizing Authorization header with control characters");
    req.headers.authorization = auth.replace(/[\r\n]+/g, " ").trim();
  }
  next();
});

const allowedOrigins = [
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env.FRONTEND_URL ? [String(process.env.FRONTEND_URL).trim()] : []),
  "https://fanhub-production.up.railway.app",
  "https://fanhub-deployment-production.up.railway.app",
];

const allowedOriginPatterns = [
  /^https:\/\/[a-z0-9-]+\.up\.railway\.app$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

app.use(
  cors({
    origin: (origin, callback) => {
      const isAllowedByList = Boolean(origin && allowedOrigins.includes(origin));
      const isAllowedByPattern = Boolean(
        origin && allowedOriginPatterns.some((pattern) => pattern.test(origin)),
      );
      if (!origin || isAllowedByList || isAllowedByPattern) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked for this origin"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(fileUpload({ useTempFiles: true }));

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  const secrets = [process.env.API_SECRET_KEY, process.env.JWT_SECRET].filter(Boolean);
  if (secrets.length === 0) {
    return next(new Error("Authentication error: JWT secret is not configured"));
  }

  let decoded = null;
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(token, secret);
      break;
    } catch (_) {}
  }

  if (!decoded) {
    return next(new Error("Authentication error: Invalid token"));
  }

  socket.user = decoded;
  next();
});

io.on("connection", (socket) => {
  const userId = resolveSocketUserId(socket);
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.userId = userId;
  socket.communityType =
    normalizeCommunityType(
      socket.handshake?.auth?.community_type ||
        socket.handshake?.auth?.site_slug ||
        socket.handshake?.headers?.["x-community-type"] ||
        socket.handshake?.headers?.["x-site-slug"] ||
        "",
    ) || "bini";

  console.log(`User connected: ${userId}`);

  // Join personal room
  socket.join(String(userId));
  console.log(`User ${userId} joined private room`);

  // Mark user as online
  const wasOffline = !onlineUsers.has(userId);
  addOnlineSocket(userId, socket.id);

  // Send current online users list to the newly connected user
  const onlineUsersList = getOnlineUserIds();
  socket.emit("online_users_list", { users: onlineUsersList });
  console.log(`Sent ${onlineUsersList.length} online users to ${userId}`);

  // Broadcast online status only when this is the first active socket
  if (wasOffline) {
    socket.broadcast.emit("user_status", { id: userId, status: "online" });
  }

  // Handle request for online users list
  socket.on("request_online_users", () => {
    const currentOnlineUsers = getOnlineUserIds();
    socket.emit("online_users_list", { users: currentOnlineUsers });
    console.log(`Re-sent ${currentOnlineUsers.length} online users to ${userId}`);
  });

  // Typing indicators
  socket.on("typing", ({ to }) => {
    if (!to) return;
    io.to(String(to)).emit("show_typing", { from: userId });
  });

  socket.on("stop_typing", ({ to }) => {
    if (!to) return;
    io.to(String(to)).emit("hide_typing", { from: userId });
  });

  // Real-time chat send + DB persist
  socket.on("send_message", async (payload = {}) => {
    const receiverId = String(
      payload?.receiver_id || payload?.receiverId || payload?.to || "",
    ).trim();
    const content = String(payload?.content || "").trim();
    if (!receiverId || !content) {
      socket.emit("message_error", { error: "receiver_id and content are required" });
      return;
    }

    const communityType =
      normalizeCommunityType(payload?.community_type) ||
      normalizeCommunityType(socket.communityType) ||
      "bini";

    try {
      const messageModel = new MessageModel();
      await messageModel.ensureConnection(communityType);
      await messageModel.sendMessage(Number(userId), Number(receiverId), content);

      const now = new Date().toISOString();
      const messageData = {
        sender_id: Number(userId),
        receiver_id: Number(receiverId),
        content,
        community_type: communityType,
        created_at: now,
        timestamp: now,
      };

      io.to(String(receiverId)).emit("receive_message", messageData);
      io.to(String(userId)).emit("message_sent", messageData);

      const unreadCount = await messageModel.getUnreadCount(Number(receiverId));
      io.to(String(receiverId)).emit("unread_count_update", { unread_count: unreadCount });
    } catch (error) {
      console.error("Socket send_message error:", error?.message || error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const nowOffline = removeOnlineSocket(userId, socket.id);
    if (nowOffline) {
      // Broadcast offline only when all sockets are disconnected
      socket.broadcast.emit("user_status", { id: userId, status: "offline" });
    }
    console.log(`User ${userId} disconnected`);
  });
});

// Routes
app.get("/", (req, res) => {
  res.json({ success: true, message: "Welcome to Bini API!" });
});

app.get("/health", async (req, res) => {
  try {
    const appDb = await connect();
    const [appRows] = await appDb.query("SELECT DATABASE() AS db, 1 AS ok");

    let adminDbName = null;
    try {
      const adminDb = await connect("admin");
      const [adminRows] = await adminDb.query("SELECT DATABASE() AS db, 1 AS ok");
      adminDbName = adminRows?.[0]?.db || null;
    } catch (_) {
      adminDbName = null;
    }

    res.json({
      status: "OK",
      app_db: appRows?.[0]?.db || null,
      admin_db: adminDbName,
    });
  } catch (err) {
    console.error("health error:", err);
    res.status(500).json({
      error: String(err?.message || err || "health failed"),
      code: String(err?.code || ""),
    });
  }
});

// Enforce site scope across all versioned API routes.
app.use("/v1", attachGlobalSiteScope);
app.use("/v1", v1);

// Start server
server.on("error", (err) => {
  console.error("Server failed to start:", err);
});

server.listen(PORT, HOST, () => {
  const publicUrl = String(
    process.env.BACKEND_PUBLIC_URL || "https://fanhub-deployment-production.up.railway.app/v1",
  ).trim();
  console.log(`Server is running on ${publicUrl}`);
});
