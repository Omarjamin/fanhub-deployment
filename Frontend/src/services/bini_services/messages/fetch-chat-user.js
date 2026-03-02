// Fetch the list of users that the current user is following
import api from "../api.js";

const FOLLOWING_ENDPOINTS = [
  "/bini/follow/following",
  "/bini/users/following",
];

function normalizeFollowedUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.following)) return payload.following;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function fetchFollowedUsers() {
  for (const endpoint of FOLLOWING_ENDPOINTS) {
    try {
      const response = await api.get(endpoint);
      return normalizeFollowedUsers(response.data);
    } catch (error) {
      if (error?.response?.status === 404) {
        continue;
      }
    }
  }

  return [];
}

export function renderUserList(users, chatList, onUserClick) {
  const safeUsers = Array.isArray(users) ? users : [];

  if (!safeUsers.length) {
    chatList.innerHTML = '<div style="text-align:center; color:#aaa; margin-top:32px;">No followed users found.</div>';
    return;
  }

  chatList.innerHTML = safeUsers
    .map((user) => {
      const userId = user.user_id ?? user.id;
      const fullName = user.fullname || user.username || "Unknown user";
      const avatar = user.profile_picture || "https://via.placeholder.com/36";

      return `
        <div class="user-item" data-user-id="${userId}">
          <img src="${avatar}" class="user-avatar" />
          <span class="user-name">${fullName}</span>
        </div>
      `;
    })
    .join("");

  chatList.querySelectorAll(".user-item").forEach((item) => {
    item.onclick = () => {
      if (onUserClick) {
        onUserClick(
          item.getAttribute("data-user-id"),
          item.querySelector(".user-name")?.textContent || "Unknown user",
          item.querySelector(".user-avatar")?.src || ""
        );
      }
    };
  });
}
