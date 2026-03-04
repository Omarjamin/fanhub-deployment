import { socket, setupSocket } from "../../../hooks/bini_hooks/socket";
import api from "../../../services/bini_services/api.js";
import "../../../styles/bini_styles/MessagingModal.css";
import { getActiveSiteSlug } from "../../../lib/site-context.js";

const DEFAULT_AVATAR = "/circle-user.png";
const API_URL = import.meta.env.VITE_API_URL || "https://fanhub-deployment-production.up.railway.app/v1";
const API_ORIGIN = String(API_URL).replace(/\/v1\/?$/, "");

function normalizeAvatarUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_AVATAR;
  if (raw === DEFAULT_AVATAR) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const normalized = raw.replace(/\\/g, "/");
  if (!normalized) return DEFAULT_AVATAR;
  if (normalized === "circle-user.png") return DEFAULT_AVATAR;

  if (normalized.startsWith("//")) {
    return `${window.location.protocol}${normalized}`;
  }

  // Absolute filesystem paths can appear in bad DB rows (Windows/Linux).
  const uploadFromAbsolute = normalized.match(
    /(?:^|\/)(uploads|upload|images|avatars|storage)\/(.+)$/i,
  );
  if (uploadFromAbsolute) {
    const folder = uploadFromAbsolute[1].toLowerCase();
    return `${API_ORIGIN}/${folder}/${uploadFromAbsolute[2]}`;
  }

  if (normalized.startsWith("/")) {
    // Backend-served avatar/upload paths should use API origin.
    if (
      normalized.startsWith("/uploads") ||
      normalized.startsWith("/upload") ||
      normalized.startsWith("/images") ||
      normalized.startsWith("/avatars") ||
      normalized.startsWith("/storage")
    ) {
      return `${API_ORIGIN}${normalized}`;
    }
    // Frontend/public asset path (e.g. /circle-user.png).
    return normalized;
  }

  // Relative paths that look like backend upload folders.
  if (
    normalized.startsWith("uploads/") ||
    normalized.startsWith("upload/") ||
    normalized.startsWith("images/") ||
    normalized.startsWith("avatars/") ||
    normalized.startsWith("storage/")
  ) {
    return `${API_ORIGIN}/${normalized.replace(/^\.?\//, "")}`;
  }

  // For plain filenames (e.g. "circle-user.png"), resolve from frontend public root.
  if (!normalized.includes("/")) {
    return `/${normalized}`;
  }

  // Keep other relative paths as-is for frontend/public resolution.
  return normalized;
}

function resolveCommunityType() {
  const fromStorage = String(
    getActiveSiteSlug() || sessionStorage.getItem("community_type") || "",
  ).trim().toLowerCase();
  if (fromStorage && fromStorage !== "community-platform") return fromStorage;

  const parts = String(window?.location?.pathname || "").split("/").filter(Boolean);
  if (parts[0] === "fanhub" && parts[1] === "community-platform" && parts[2]) {
    return String(parts[2]).toLowerCase();
  }
  if (parts[0] === "fanhub" && parts[1] && parts[1] !== "community-platform") {
    return String(parts[1]).toLowerCase();
  }
  if (parts[0] === "bini") return "bini";
  return "";
}

export default class MessagingModal {
  constructor() {
    this.modal = null;
    this.chatList = null;
    this.chatFooter = null;
    this.currentChatUserId = null;
    this.currentUserId = null;
    this.currentUserProfilePic = null;
    this.onlineUsers = new Set();
    this.socket = socket || setupSocket();
    this.avatarCache = new Map();
    this.miniWindows = [];
    this.miniWidth = 350;
    this.miniGap = 10;
    // Add tabs state
    this.activeTab = "all"; // "all", "following", "followers"
    this.reportMenuOutsideHandlerBound = false;

    this.setupSocketHandlers();
  }

  async reportChatUser(reportedUserId, reason, messageId = null) {
    const payload = {
      reported_user_id: Number(reportedUserId),
      reason,
    };
    if (messageId) payload.message_id = messageId;
    await api.post("/bini/message/report", payload);
  }

  timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " mon";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " m";
    return "Just now";
  }

  // socket handlers
  setupSocketHandlers() {
    if (!this.socket) {
      return;
    }

    this.socket.off("receive_message");
    this.socket.off("show_typing");
    this.socket.off("hide_typing");

    this.socket.on("receive_message", (message) => {
      console.log("Received message:", message);
      const isCurrentChat =
        String(message.sender_id) === String(this.currentChatUserId);

      // mini window append
      const mini = this.miniWindows.find(
        (m) => String(m.userId) === String(message.sender_id),
      );
      if (mini) {
        console.log("Appending to mini window:", mini.userId);
        this.appendMiniMessage(message, mini.userId);
      }

      // Real-time reorder + unread update
      const senderRow = this.chatList.querySelector(
        `.chat-user[data-user-id="${message.sender_id}"]`,
      );
      if (senderRow) {
        // Update preview & timestamp directly on the real row
        const previewEl = senderRow.querySelector(".chat-preview");
        const timeEl = senderRow.querySelector('div[style*="font-size:11px"]');
        const timeAgo = this.timeAgo(
          message.created_at || message.timestamp || new Date(),
        );

        if (previewEl) {
          const prefix =
            String(message.sender_id) === String(this.currentUserId)
              ? "You: "
              : "";
          previewEl.innerHTML = `${prefix}${message.content}`;
        }
        if (timeEl) {
          timeEl.innerHTML = `${timeAgo}<span class="unread-dot-inline"></span>`;
        }

        // Re-order: move the real row to the top
        senderRow.remove();
        this.chatList.prepend(senderRow);
      }

      if (!isCurrentChat) {
        const row = this.chatList.querySelector(
          `.chat-user[data-user-id="${message.sender_id}"]`,
        );
        if (!row) return;
        row.classList.add("unread");

        let badge = row.querySelector(".unread-badge");
        if (badge) badge.remove();

        const timeEl = row.querySelector(".chat-user-time");
        if (timeEl && !timeEl.querySelector(".unread-dot-inline")) {
          const dot = document.createElement("span");
          dot.className = "unread-dot-inline";
          timeEl.appendChild(dot);
        }
      }

      if (
        isCurrentChat ||
        String(message.recipient_id) === String(this.currentChatUserId)
      ) {
        this.appendMessage(message, message.sender_id !== this.currentUserId);
        this.scrollToBottom();
      }
    });

    this.socket.on("show_typing", ({ from }) => {
      if (String(from) === String(this.currentChatUserId)) {
        const indicator = this.modal?.querySelector("#typingIndicator");
        if (indicator) indicator.style.display = "flex";
      }

      // mini windows
      this.miniWindows.forEach((m) => {
        if (String(m.userId) === String(from)) {
          const ind = m.el.querySelector(".mini-typing-indicator");
          if (ind) {
            ind.style.display = "flex";
            void ind.offsetHeight;
            ind.style.opacity = "1";
          }
          const body = m.el.querySelector(".mini-chat-body");
          if (body) body.scrollTop = body.scrollHeight;
        }
      });
    });

    this.socket.on("hide_typing", ({ from }) => {
      if (String(from) === String(this.currentChatUserId)) {
        const indicator = this.modal?.querySelector("#typingIndicator");
        if (indicator) indicator.style.display = "none";
      }

      this.miniWindows.forEach((m) => {
        if (String(m.userId) === String(from)) {
          const ind = m.el.querySelector(".mini-typing-indicator");
          if (ind) {
            ind.style.opacity = "0";
            setTimeout(() => {
              if (ind.style.opacity === "0") ind.style.display = "none";
            }, 300);
          }
        }
      });
    });

    this.socket.on("unread_count_update", ({ unread_count }) => {
      if (typeof updateNavMessageBadge === "function") {
        updateNavMessageBadge(unread_count); // global func sa navigation.js
      }
    });
  }

  /*MAIN MODAL*/
  async show() {
    const oldModal = document.getElementById("messaging-modal");
    if (oldModal) oldModal.remove();

    this.modal = document.createElement("div");
    this.modal.id = "messaging-modal";
    this.modal.innerHTML = `
      <div id="messagingHeader">
        <span class="messaging-title">Messages</span>
        <div class="messaging-header-actions">
          <button id="closeMessagingModal" class="close-button">&times;</button>
        </div>
      </div>
      
      <!-- Tabs for filtering -->
      <div class="message-tabs">
        <button class="message-tab active" data-tab="all">All</button>
        <button class="message-tab" data-tab="following">Following</button>
        <button class="message-tab" data-tab="followers">Followers</button>
      </div>
      
      <!-- Chat List -->
      <div id="chatList">
        <div class="loading-state">Loading conversations...</div>
      </div>
      <div id="chatContainer">
        <div id="messagesContainer"></div>
        <div class="message-form">
          <form id="messageForm">
            <input type="text" id="messageInput" class="message-input" placeholder="Type a message..." autocomplete="off">
            <button type="submit" class="send-button">Send</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
    this.chatList = this.modal.querySelector("#chatList");
    this.chatFooter = this.modal.querySelector("#chatContainer");

    this.setupEventListeners();
    await this.loadCurrentUser();

    // Setup tab click handlers
    const tabs = this.modal.querySelectorAll(".message-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Update active tab
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.activeTab = tab.dataset.tab;
        this.loadChatList(); // Reload chat list with new filter
      });
    });

    // Ensure socket is set up and connected
    if (!this.socket) {
      this.socket = setupSocket() || window.socket;
    }
    // Re-bind safely (uses socket.off first) to avoid missing realtime events
    this.setupSocketHandlers();

    if (this.socket) {
      if (!this.socket.connected) {
        console.log("Socket not connected, connecting now...");
        this.socket.connect();
        // Wait a bit for connection, then request online users
        setTimeout(() => {
          if (this.socket?.connected) {
            this.socket.emit("request_online_users");
          }
        }, 500);
      } else {
        // Request online users list immediately if already connected
        this.socket.emit("request_online_users");
      }
    } else {
      console.warn("Socket not available, status updates may not work");
    }

    // Listen for initial online users list
    const handleOnlineUsersList = (e) => {
      const { users } = e.detail;
      console.log(`Initializing ${users.length} online users`);
      // Clear and populate the online users set
      this.onlineUsers.clear();
      users.forEach((userId) => {
        this.onlineUsers.add(String(userId));
      });
      // Update UI for all users in the chat list
      this.chatList?.querySelectorAll(".chat-user").forEach((item) => {
        const userId = String(item.dataset.userId);
        const isOnline = this.onlineUsers.has(userId);
        this.paintStatus(userId, isOnline);
      });
      // Update mini windows status
      this.miniWindows.forEach((m) => {
        const userId = String(m.userId);
        const isOnline = this.onlineUsers.has(userId);
        this.updateMiniStatus(userId, isOnline);
      });
    };

    // listen for user status updates
    const handleUserStatusUpdate = (e) => {
      const { id, status } = e.detail;
      const userId = String(id);
      if (status === "online") this.onlineUsers.add(userId);
      else this.onlineUsers.delete(userId);

      this.paintStatus(userId, status === "online");
      this.updateMiniStatus(userId, status === "online");
    };

    window.addEventListener("onlineUsersList", handleOnlineUsersList);
    window.addEventListener("userStatusUpdate", handleUserStatusUpdate);

    // Store handlers for cleanup
    this._onlineUsersListHandler = handleOnlineUsersList;
    this._userStatusUpdateHandler = handleUserStatusUpdate;

    await this.loadChatList();
  }

  async loadCurrentUser() {
    try {
      const res = await api.get("/bini/users/profile");
      const user = res.data;

      this.currentUserId = user.user.user_id;
      this.currentUserProfilePic =
        normalizeAvatarUrl(user.user.profile_picture);
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  }

  async loadChatList() {
    this.chatList.innerHTML =
      '<div class="loading-state">Loading conversations...</div>';

    try {
      const communityType = resolveCommunityType();
      const requestConfig = communityType
        ? { headers: { "x-community-type": communityType } }
        : {};

      // Fetch following and followers in parallel
      const [followingRes, followersRes] = await Promise.all([
        api.get("/bini/follow/following", requestConfig),
        api.get("/bini/follow/followers", requestConfig),
      ]);

      const following = followingRes.data;
      const followers = followersRes.data;

      console.log("FOLLOWING", following);
      console.log("FOLLOWERS", followers);

      // Create maps for easy lookup
      const followingIds = new Set(following.map((u) => u.user_id));
      const followersIds = new Set(followers.map((u) => u.user_id));

      // Create a map of all users with their follow relationship info
      const userMap = new Map();

      // Add following users
      following.forEach((u) => {
        const userId = u.user_id;
        if (!userMap.has(userId)) {
          u.is_online = this.onlineUsers.has(String(userId));
          u.following_status = true; // This user is being followed by current user
          u.follower_status = followersIds.has(userId); // This user follows current user
          userMap.set(userId, u);
        }
      });

      // Add followers users
      followers.forEach((u) => {
        const userId = u.user_id;
        if (userMap.has(userId)) {
          // User already exists (mutual follow), update follower status
          const existing = userMap.get(userId);
          existing.follower_status = true;
        } else {
          // New user (only follower, not following)
          u.is_online = this.onlineUsers.has(String(userId));
          u.following_status = false;
          u.follower_status = true;
          userMap.set(userId, u);
        }
      });

      let users = Array.from(userMap.values());

      console.log("ALL USERS", users);

      // Filter users based on active tab
      let filteredUsers = users;
      if (this.activeTab === "following") {
        filteredUsers = users.filter((u) => u.following_status);
      } else if (this.activeTab === "followers") {
        filteredUsers = users.filter((u) => u.follower_status);
      } else if (this.activeTab === "all") {
        // Show all users (both following and followers)
        filteredUsers = users;
      }

      // Fetch latest message previews
      const previewRes = await api.get("/bini/message/preview");
      const previews = previewRes.data;

      console.log("PREVIEWS", previews);

      // Map previews by user_id
      const previewMap = {};
      previews.forEach((p) => {
        previewMap[p.user_id] = p;
      });

      // Merge preview messages into user list
      filteredUsers.forEach((u) => {
        const preview = previewMap[u.user_id];
        if (preview) {
          u.last_message = preview.last_message;
          u.sender_id = preview.sender_id;
          u.last_message_time = preview.created_at;
          u.unread_count = preview.unread_count;
        }
      });

      // Sort users: messages first by latest time, then users without messages
      filteredUsers.sort((a, b) => {
        const timeA = new Date(a.last_message_time || 0);
        const timeB = new Date(b.last_message_time || 0);
        return timeB - timeA;
      });

      // Cache avatars for quick load
      filteredUsers.forEach((u) =>
        this.avatarCache.set(
          u.user_id,
          normalizeAvatarUrl(u.profile_picture),
        ),
      );

      // Render the user list with previews
      this.renderUserList(filteredUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      this.chatList.innerHTML =
        '<div class="error-state">Failed to load conversations.</div>';
    }

    if (typeof updateNavMessageBadge === "function") {
      updateNavMessageBadge(0);
    }
  }

  renderUserList(users) {
    if (!this.chatList) return;

    console.log("RENDERING USERS", users);

    if (!users || users.length === 0) {
      this.chatList.innerHTML = `<div class="no-conversations">No ${this.activeTab === "all" ? "" : this.activeTab} conversations yet</div>`;
      return;
    }

    this.chatList.innerHTML = users
      ?.map((u) => {
        const timeAgo = u.last_message_time
          ? this.timeAgo(u.last_message_time)
          : "";
        const unread = Number(u.unread_count) || 0;
        const isUnread = unread > 0;

        // Add follow relationship indicator
        let followBadge = "";
        if (u.following_status && u.follower_status) {
          followBadge = '<span class="follow-badge mutual">Mutual</span>';
        } else if (u.following_status) {
          followBadge = '<span class="follow-badge following">Following</span>';
        } else if (u.follower_status) {
          followBadge =
            '<span class="follow-badge follower">Follows you</span>';
        }

        return `
        <div class="chat-user ${isUnread ? "unread" : ""}"
             data-user-id="${u.user_id}"
             data-user-name="${u.fullname}"
             data-user-avatar="${encodeURIComponent(normalizeAvatarUrl(u.profile_picture))}">

          <!-- Avatar + online dot + unread dot -->
          <div class="chat-user-avatar-container">
            <img src="${normalizeAvatarUrl(u.profile_picture)}"
                 alt="${u.fullname}"
                 class="chat-user-avatar"
                 onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
            <span class="online-dot" style="background:${u.is_online ? "#4CAF50" : "#ccc"};"></span>
            ${isUnread ? `<span class="unread-dot"></span>` : ""}
          </div>

          <!-- Name + Preview + Time -->
          <div class="chat-user-info">
            <div class="chat-user-name-row">
              <div class="chat-user-name">
                ${u.fullname || u.username}
              </div>
              ${followBadge}
            </div>
            <div class="chat-user-preview-row">
              <div class="chat-preview">
                ${u.last_message ? (String(u.sender_id) === String(this.currentUserId) ? "You: " : "") + u.last_message : ""}
              </div>
              <div class="chat-user-time">
                ${timeAgo}
                ${isUnread ? '<span class="unread-dot-inline"></span>' : ""}
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Click handler + mark-as-read
    this.chatList.querySelectorAll(".chat-user").forEach((item) => {
      item.addEventListener("click", async () => {
        const userId = item.dataset.userId;
        const userName = item.dataset.userName;
        const userAvatar = item.dataset.userAvatar;

        // Only mark as read if unread
        if (item.classList.contains("unread")) {
          try {
            await api.patch(`/bini/message/read/${userId}`);

            // Update UI in real-time
            item.classList.remove("unread");
            item.querySelector(".unread-dot")?.remove();
            const timeEl = item.querySelector(".chat-user-time");
            timeEl?.querySelector(".unread-dot-inline")?.remove();
          } catch (error) {
            console.error(
              `Failed to mark messages as read for user ${userId}:`,
              error,
            );
          }
        }

        // Open mini chat window
        this.createMiniChatWindow(userId, userName, userAvatar);
      });
    });
  }

  /*MINI CHAT WINDOWS*/
  createMiniChatWindow(userId, userName, userAvatar) {
    userId = String(userId);
    setTimeout(() => {
      const listItem = document.querySelector(
        `.chat-user[data-user-id="${userId}"]`,
      );
      if (listItem) {
        listItem.classList.remove("unread");
        listItem.style.backgroundColor = "transparent";
        listItem.style.fontWeight = "normal";
        const preview = listItem.querySelector(".chat-preview");
        if (preview) {
          preview.style.fontWeight = "normal";
          preview.style.color = "#65676B";
        }
        listItem.querySelector(".unread-dot-inline")?.remove();
      }
    }, 0);

    // Mark as read in backend
    api.patch(`/bini/message/read/${userId}`).catch(() => {});

    const existing = this.miniWindows.find((m) => String(m.userId) === userId);
    if (existing) {
      this.miniWindows = this.miniWindows.filter((m) => m !== existing);
      this.miniWindows.unshift(existing);
      this.repositionMiniWindows();
      return;
    }

    const decodedAvatar = decodeURIComponent(
      userAvatar || DEFAULT_AVATAR,
    );

    const mini = document.createElement("div");
    mini.className = "mini-chat-window";
    mini.dataset.userId = userId;
    mini.style.width = `${this.miniWidth}px`;
    mini.style.right = `20px`;

    mini.innerHTML = `
    <div class="mini-chat-header">
      <div class="mini-chat-header-content">
        <div class="mini-chat-avatar-container">
          <img src="${decodedAvatar}" alt="${userName}" class="mini-chat-avatar" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
          <span class="mini-online-dot" style="background:${this.onlineUsers.has(userId) ? "#4CAF50" : "#ccc"};"></span>
        </div>
        <div class="mini-chat-user-info">
          <span class="mini-username">${userName}</span>
          <span class="mini-user-status" data-user-id="${userId}">
            ${this.onlineUsers.has(userId) ? "Active now" : "Offline"}
          </span>
        </div>
      </div>
      <div class="mini-chat-header-actions">
        <button class="mini-report-toggle" title="Report options" aria-label="Report options">&#8942;</button>
        <div class="mini-report-menu">
          <button class="mini-report-option" data-reason="spam">Report spam</button>
          <button class="mini-report-option" data-reason="harassment">Report harassment</button>
          <button class="mini-report-option" data-reason="misleading information">Report misleading information</button>
          <button class="mini-report-option" data-reason="inappropriate content">Report inappropriate content</button>
        </div>
        <button class="mini-chat-close" title="Close">&times;</button>
      </div>
    </div>

    <div class="mini-chat-body" id="miniChatMessages-${userId}">
      <div class="mini-loading">Loading...</div>
      <div class="mini-typing-indicator" style="display: none;">
        <img src="${decodedAvatar}" class="typing-avatar" alt="typing" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
        <div class="typing-bubble">
          <span class="typing-dot-inline"></span>
          <span class="typing-dot-inline typing-dot-delay-1"></span>
          <span class="typing-dot-inline typing-dot-delay-2"></span>
        </div>
      </div>
    </div>

    <div class="mini-chat-footer">
      <input type="text" class="mini-input" placeholder="Type a message..." autocomplete="off" />
      <button class="mini-send">Send</button>
    </div>
  `;

    document.body.appendChild(mini);
    this.miniWindows.unshift({ userId, el: mini });
    this.repositionMiniWindows();

    // Close button
    mini.querySelector(".mini-chat-close").addEventListener("click", () => {
      this.closeMiniWindow(userId);
    });

    const reportToggle = mini.querySelector(".mini-report-toggle");
    const reportMenu = mini.querySelector(".mini-report-menu");
    reportToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".mini-report-menu.open").forEach((menu) => {
        if (menu !== reportMenu) menu.classList.remove("open");
      });
      reportMenu?.classList.toggle("open");
    });
    mini.querySelectorAll(".mini-report-option").forEach((optionBtn) => {
      optionBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const reason = optionBtn.getAttribute("data-reason") || "spam";
        const latestMessage = mini.querySelector(".mini-message-row:last-child");
        const messageId = latestMessage?.dataset?.messageId || null;
        try {
          await this.reportChatUser(userId, reason, messageId);
          reportMenu?.classList.remove("open");
          alert("Report submitted. Thank you.");
        } catch (err) {
          alert(err?.response?.data?.error || "Failed to submit report.");
        }
      });
    });

    // Input & send handlers
    const input = mini.querySelector(".mini-input");
    const sendBtn = mini.querySelector(".mini-send");
    let typingTimeout;

    input.addEventListener("input", () => {
      if (!this.socket?.connected) return;
      this.socket.emit("typing", { to: userId });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        this.socket.emit("stop_typing", { to: userId });
      }, 1000);
    });

    sendBtn.addEventListener("click", async () => {
      const content = input.value.trim();
      if (!content) return;

      // Create message data for immediate display
      const messageData = {
        sender_id: this.currentUserId,
        receiver_id: userId,
        content,
        community_type: resolveCommunityType() || "bini",
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      // Display message immediately for better UX
      this.appendMiniMessage(messageData, userId);

      // Send via socket for real-time delivery
      if (this.socket?.connected) {
        this.socket.emit("send_message", messageData);
      } else {
        // Fallback to HTTP if socket not connected
        try {
          await api.post("/bini/message", { receiver_id: userId, content });
        } catch (err) {
          console.error("Error sending mini message:", err);
          // Remove the message if sending failed
          const container = document.querySelector(
            `#miniChatMessages-${userId}`,
          );
          const lastMessage = container?.querySelector(
            ".mini-message-row:last-child",
          );
          if (lastMessage) lastMessage.remove();
        }
      }

      input.value = "";
      if (this.socket?.connected) {
        this.socket.emit("stop_typing", { to: userId });
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    this.loadMiniMessages(userId);
  }

  repositionMiniWindows() {
    this.miniWindows.forEach((m, index) => {
      const right = 20 + index * (this.miniWidth + this.miniGap);
      m.el.style.right = `${right}px`;
      m.el.style.zIndex = String(12000 + (this.miniWindows.length - index));
    });
  }

  closeMiniWindow(userId) {
    userId = String(userId);
    const idx = this.miniWindows.findIndex((m) => String(m.userId) === userId);
    if (idx === -1) return;
    const removed = this.miniWindows.splice(idx, 1)[0];
    if (removed?.el) removed.el.remove();
    this.repositionMiniWindows();
  }

  updateMiniStatus(userId, isOnline) {
    this.miniWindows.forEach((m) => {
      if (String(m.userId) === String(userId)) {
        const dot = m.el.querySelector(".mini-online-dot");
        const status = m.el.querySelector(".mini-user-status");
        if (dot) dot.style.background = isOnline ? "#4CAF50" : "#ccc";
        if (status)
          status.textContent = isOnline ? "Active now" : "Offline";
      }
    });
  }

  async loadMiniMessages(userId) {
    userId = String(userId);
    const container = document.querySelector(`#miniChatMessages-${userId}`);
    if (!container) return;

    // Save the typing indicator if it exists
    const typingIndicator = container.querySelector(".mini-typing-indicator");

    // Clear the container but keep the loading message
    container.innerHTML = '<div class="mini-loading">Loading...</div>';

    try {
      const res = await api.get(`/bini/message/${userId}`);
      const response = res.data;
        console.log("===== API RESPONSE DEBUG =====");
        console.log("Full API Response:", response);
        console.log("Response type:", typeof response);
        console.log("Is array?", Array.isArray(response));

        // Clear the loading message
        container.innerHTML = "";

        // Re-add typing indicator if it existed
        if (typingIndicator) {
          container.appendChild(typingIndicator);
        }

        // Check if the response has a messages/data array property
        let messages = [];
        if (Array.isArray(response)) {
          console.log("Response is an array with length:", response.length);
          messages = response;
        } else if (response.messages && Array.isArray(response.messages)) {
          console.log("Response has messages array with length:", response.messages.length);
          messages = response.messages;
        } else if (response.data && Array.isArray(response.data)) {
          console.log("Response has data array with length:", response.data.length);
          messages = response.data;
        } else {
          console.error("Unexpected response structure:", response);
          container.innerHTML = '<div class="error-loading">Invalid response format</div>';
          return;
        }

        console.log("Parsed messages array:", messages);

        if (messages.length === 0) {
          console.log("No messages found");
          // Show empty state
          const emptyState = document.createElement('div');
          emptyState.className = 'empty-messages';
          emptyState.textContent = 'No messages yet. Start the conversation!';
          container.appendChild(emptyState);
        } else {
          console.log(`Processing ${messages.length} messages`);

          // Log current user info
          console.log("Current user ID:", this.currentUserId);
          console.log("Chat user ID:", userId);

          // Add the messages
          messages.forEach((m, index) => {
            console.log(`\n--- Message ${index + 1} ---`);
            console.log("Full message object:", m);
            console.log("Message sender_id:", m.sender_id, "Type:", typeof m.sender_id);
            console.log("Message content:", m.content || m.message_content || m.text);
            console.log("Message created_at:", m.created_at || m.timestamp);

            // Try to append without filtering first
            this.appendMiniMessage(m, userId);
          });
        }

        container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error("Error loading mini messages:", err);
      container.innerHTML = '<div class="error-loading">Error loading messages</div>';
    }
  }

  appendMiniMessage(message, chatUserId) {
    console.log("\n===== APPEND MINI MESSAGE =====");
    console.log("Message to append:", message);
    console.log("Chat User ID:", chatUserId);

    chatUserId = String(chatUserId);
    const container = document.querySelector(`#miniChatMessages-${chatUserId}`);

    if (!container) {
      console.error("❌ Mini chat container not found for userId:", chatUserId);
      return;
    }

    console.log("✅ Container found");

    // Remove loading state if it exists
    const loadingEl = container.querySelector(".mini-loading");
    if (loadingEl) {
      console.log("Removing loading indicator");
      loadingEl.remove();
    }

    // Remove empty state if it exists
    const emptyEl = container.querySelector(".empty-messages");
    if (emptyEl) {
      console.log("Removing empty state");
      emptyEl.remove();
    }

    // Get sender info
    const senderId = String(message.sender_id || message.senderId || message.from);
    console.log("Sender ID:", senderId);
    console.log("Current User ID:", this.currentUserId);

    // Determine if this is a received message (from the other user to current user)
    // A message is received if:
    // 1. The sender is NOT the current user AND
    // 2. The sender IS the chat user OR the recipient is the current user
    const isFromCurrentUser = senderId === String(this.currentUserId);
    const isFromChatUser = senderId === chatUserId;
    const recipientId = String(message.recipient_id || message.receiver_id || message.to || "");
    const isToCurrentUser = recipientId === String(this.currentUserId);

    console.log("isFromCurrentUser:", isFromCurrentUser);
    console.log("isFromChatUser:", isFromChatUser);
    console.log("isToCurrentUser:", isToCurrentUser);

    // For debugging, let's try to determine if this message belongs to this conversation
    const belongsToConversation =
      (isFromCurrentUser && (isToCurrentUser || isFromChatUser)) || // Current user sent to chat user
      (isFromChatUser && (isToCurrentUser || isFromCurrentUser)) || // Chat user sent to current user
      (isFromCurrentUser && chatUserId === recipientId) || // Current user sent to this chat user
      (isFromChatUser && String(this.currentUserId) === recipientId); // Chat user sent to current user

    console.log("Belongs to conversation:", belongsToConversation);

    // For now, let's try to display all messages regardless of conversation check
    // Just to see if any messages appear
    const isMessageReceived = !isFromCurrentUser;
    console.log("Display as received message:", isMessageReceived);

    // Get message content from different possible field names
    const messageText = message.content ||
      message.message_content ||
      message.text ||
      message.body ||
      message.message ||
      "No content";

    console.log("Message text to display:", messageText);

    // Get timestamp
    const timestamp = message.created_at ||
      message.timestamp ||
      message.sent_at ||
      message.date ||
      message.createdAt ||
      new Date().toISOString();

    console.log("Timestamp:", timestamp);

    // Get avatar
    let userAvatar = DEFAULT_AVATAR;
    if (isMessageReceived) {
      // For received messages, try to get avatar from various sources
      userAvatar = message.sender_profile_picture ||
        message.sender_avatar ||
        message.avatar ||
        this.avatarCache.get(chatUserId) ||
        DEFAULT_AVATAR;
    } else {
      userAvatar = this.currentUserProfilePic || DEFAULT_AVATAR;
    }
    userAvatar = normalizeAvatarUrl(userAvatar);

    console.log("Using avatar:", userAvatar);

    // Create message container
    const messageContainer = document.createElement("div");
    messageContainer.className = `mini-message-row ${isMessageReceived ? "received" : "sent"}`;
    messageContainer.dataset.messageId = message.id || message.message_id || Date.now();
    messageContainer.dataset.senderId = senderId;

    // Only show profile picture for received messages
    if (isMessageReceived) {
      const avatarImg = document.createElement("img");
      avatarImg.src = userAvatar;
      avatarImg.alt = "Avatar";
      avatarImg.className = "mini-message-avatar";
      avatarImg.onerror = () => {
        avatarImg.onerror = null;
        console.log("Avatar failed to load, using placeholder");
        avatarImg.src = DEFAULT_AVATAR;
      };
      messageContainer.appendChild(avatarImg);
    }

    // Create message content
    const messageContent = document.createElement("div");
    messageContent.className = "mini-message-content";

    // Create message bubble
    const bubble = document.createElement("div");
    bubble.className = `mini-message-bubble ${isMessageReceived ? "received" : "sent"}`;
    bubble.textContent = messageText;

    // Add timestamp
    const time = document.createElement("div");
    time.className = "mini-message-time";

    const messageTime = new Date(timestamp);

    if (!isNaN(messageTime.getTime())) {
      time.textContent = messageTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      time.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    bubble.appendChild(time);
    messageContent.appendChild(bubble);
    messageContainer.appendChild(messageContent);

    // Insert the message before the typing indicator if it exists
    const typingIndicator = container.querySelector(".mini-typing-indicator");
    if (typingIndicator) {
      console.log("Inserting message before typing indicator");
      container.insertBefore(messageContainer, typingIndicator);
    } else {
      console.log("Appending message to container");
      container.appendChild(messageContainer);
    }

    console.log("✅ Message appended to DOM");

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Return the created element for debugging
    return messageContainer;
  }

  /* MAIN MODAL MESSAGE APPEND*/
  appendMessage(message, isReceived) {
    const messagesContainer = this.modal.querySelector("#messagesContainer");
    const date = message.created_at ? new Date(message.created_at) : new Date();
    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let profilePic = isReceived
      ? this.avatarCache.get(message.sender_id)
      : this.currentUserProfilePic;
    if (!profilePic) profilePic = DEFAULT_AVATAR;
    profilePic = normalizeAvatarUrl(profilePic);

    const msg = document.createElement("div");
    msg.className = `main-message-container ${isReceived ? "" : "sent"}`;

    msg.innerHTML = `
      <img src="${profilePic}" class="main-message-avatar" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
      <div class="main-message-bubble ${isReceived ? "received" : "sent"}">
        <div class="main-message-content">${message.content}</div>
        <div class="main-message-time">${time}</div>
      </div>
    `;
    messagesContainer.appendChild(msg);
    this.scrollToBottom();
  }

  scrollToBottom() {
    const messagesContainer = this.modal.querySelector("#messagesContainer");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  paintStatus(userId, isOnline) {
    const dot = document.querySelector(
      `.chat-user[data-user-id="${userId}"] .online-dot`,
    );
    if (dot) dot.style.background = isOnline ? "#4CAF50" : "#ccc";
  }

  close() {
    // Clean up socket listeners
    if (this.socket) {
      this.socket.off("receive_message");
      this.socket.off("show_typing");
      this.socket.off("hide_typing");
    }

    // Remove window event listeners
    if (this._onlineUsersListHandler) {
      window.removeEventListener(
        "onlineUsersList",
        this._onlineUsersListHandler,
      );
      this._onlineUsersListHandler = null;
    }
    if (this._userStatusUpdateHandler) {
      window.removeEventListener(
        "userStatusUpdate",
        this._userStatusUpdateHandler,
      );
      this._userStatusUpdateHandler = null;
    }

    this.miniWindows.forEach((m) => m.el.remove());
    this.miniWindows = [];
    this.modal?.remove();
    this.modal = null;
  }

  setupEventListeners() {
    // Close modal when clicking the close button
    const closeButton = this.modal?.querySelector("#closeMessagingModal");
    if (closeButton) {
      closeButton.addEventListener("click", () => this.close());
    }

    if (!this.reportMenuOutsideHandlerBound) {
      document.addEventListener("click", () => {
        document.querySelectorAll(".mini-report-menu.open").forEach((menu) => {
          menu.classList.remove("open");
        });
      });
      this.reportMenuOutsideHandlerBound = true;
    }

    // Message form submission
    const messageForm = this.modal?.querySelector("#messageForm");
    if (messageForm) {
      messageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = messageForm.querySelector("#messageInput");
        const message = input.value.trim();
        if (message && this.currentChatUserId) {
          // Create message data
          const messageData = {
            sender_id: this.currentUserId,
            receiver_id: this.currentChatUserId,
            content: message,
            community_type: resolveCommunityType() || "bini",
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString(),
          };

          // Display message immediately
          this.appendMessage(messageData, false);

          // Send via socket
          if (this.socket?.connected) {
            this.socket.emit("send_message", messageData);
          } else {
            // Fallback to HTTP API
            // You could implement HTTP fallback here if needed
            console.warn("Socket not connected, message not sent");
          }

          input.value = "";
          this.scrollToBottom();
        }
      });
    }
  }
}





