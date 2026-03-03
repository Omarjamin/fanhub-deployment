import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import v1 from "./Routers/index.js";
import "./core/database.js";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import { connect } from "./core/database.js";

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
const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store online users
const onlineUsers = new Map();

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
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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

  try {
    const decoded = jwt.verify(token, process.env.API_SECRET_KEY);
    socket.user = decoded;
    console.log("JWT decoded", decoded);
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user?.id;
  console.log(`User connected: ${userId}`);

  // Join personal room
  socket.join(String(userId));
  console.log(`User ${userId} joined private room`);

  // 🟢 Mark user as online
  onlineUsers.set(userId, socket.id);

  // Send current online users list to the newly connected user
  const onlineUsersList = Array.from(onlineUsers.keys());
  socket.emit("online_users_list", { users: onlineUsersList });
  console.log(`Sent ${onlineUsersList.length} online users to ${userId}`);

  // Broadcast user's online status to ALL other users
  socket.broadcast.emit("user_status", { id: userId, status: "online" });

  // Handle request for online users list
  socket.on("request_online_users", () => {
    const currentOnlineUsers = Array.from(onlineUsers.keys());
    socket.emit("online_users_list", { users: currentOnlineUsers });
    console.log(
      `Re-sent ${currentOnlineUsers.length} online users to ${userId}`,
    );
  });

  // Typing indicators
  socket.on("typing", ({ to }) => {
    if (!to) return;
    console.log(`typing event from ${userId} to ${to}`);
    io.to(String(to)).emit("show_typing", { from: userId });
  });

  socket.on("stop_typing", ({ to }) => {
    if (!to) return;
    console.log(`stop typing from ${userId} to ${to}`);
    io.to(String(to)).emit("hide_typing", { from: userId });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(userId);
      // Broadcast offline status to all other users
      socket.broadcast.emit("user_status", { id: userId, status: "offline" });
      console.log(`User ${userId} disconnected`);
    }
  });
});

// Routes
app.get("/", (req, res) => {
  res.json({ success: true, message: "Welcome to Bini API!✨🤖" });
});


app.get("/health", async (req, res) => {
  try {
    const admin = await connect("bini");
    await admin.query("SELECT 1");
    res.json({ status: "OK" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/v1", v1);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});


