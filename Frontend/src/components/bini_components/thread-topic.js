import fetchThreads from "../../services/bini_services/thread/thread-api.js";
import {
  getComments as apiGetComments,
  createComment as apiCreateComment,
} from "../../services/bini_services/post/create-comment-api.js";
import api from "../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken } from "../../lib/site-context.js";
import { formatUserTimestamp } from "../../utils/user-time.js";

function navigateHome() {
  history.back();
}

function attachCloseButton(root) {
  const btn = root.querySelector(".thread-topic-close");
  if (btn) btn.addEventListener("click", navigateHome);
}

function formatDateDisplay(value) {
  if (!value) return "";
  return formatUserTimestamp(value);
}

export default async function ThreadTopic(params) {
  const root = this.root;
  // params may be an array of capture groups or an object with named groups
  let threadId;
  if (Array.isArray(params)) {
    threadId = params[0];
  } else if (params && typeof params === "object") {
    threadId = params.id || Object.values(params)[0];
  } else {
    threadId = params;
  }

  try {
    const threads = await fetchThreads();
    const thread = threads.find((t) => String(t.id) === String(threadId));

    if (!thread) {
      root.innerHTML = `
        <div class="thread-topic-container">
          <button type="button" class="thread-topic-close" aria-label="Close">&times;</button>
          <div class="thread-not-found">
            <h2>Thread not found</h2>
            <p>The thread you're looking for doesn't exist.</p>
            <a href="/bini">Go back to home</a>
          </div>
        </div>
      `;
      attachCloseButton(root);
      return;
    }

    const isPinned = Boolean(thread.isPinned ?? thread.is_pinned);

    root.innerHTML = `
      <div class="thread-topic-container">
        <button type="button" class="thread-topic-close" aria-label="Close">&times;</button>
        <div class="thread-topic-header">
          <div class="thread-topic-meta">
            <div class="thread-topic-date">${thread.date}</div>
            <div class="thread-topic-venue">${thread.venue}</div>
          </div>
          <h1 class="thread-topic-title">
            ${thread.title}
          </h1>
          <div class="thread-topic-author">By ${thread.author}${isPinned ? ' <span class="thread-topic-pin">Pinned</span>' : ''}</div>
        </div>

        <div class="thread-topic-content">
          <div class="thread-discussion">
            <h2 class="discussion-header">Discussion</h2>
            <div class="discussion-area">
              <div class="comments-list" aria-live="polite"></div>

              <form class="create-comment-form" style="margin-top:12px;">
                <textarea name="comment" class="create-comment-input" rows="3" placeholder="Write a comment..." style="width:100%;padding:8px;resize:vertical;"></textarea>
                <div style="text-align:right;margin-top:6px;">
                  <button type="submit" class="btn btn-primary btn-sm">Comment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
    attachCloseButton(root);

    // --- Comments logic ---
    const commentsListEl = root.querySelector(".comments-list");
    const createForm = root.querySelector(".create-comment-form");

    function saveLocalComments(comments) {
      const key = `thread-comments-${threadId}`;
      sessionStorage.setItem(key, JSON.stringify(comments));
    }

    function readLocalComments() {
      const key = `thread-comments-${threadId}`;
      const raw = sessionStorage.getItem(key);
      if (!raw) return [];
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function normalizeReply(reply) {
      return {
        id: reply?.id ?? reply?.reply_id ?? `reply-${Date.now()}`,
        content: reply?.content ?? reply?.reply_content ?? "",
        author: reply?.author ?? reply?.fullname ?? reply?.username ?? "You",
        date: reply?.date ?? formatDateDisplay(reply?.created_at),
      };
    }

    function normalizeComment(comment) {
      const repliesRaw = Array.isArray(comment?.replies) ? comment.replies : [];
      return {
        ...comment,
        id: comment?.id ?? comment?.comment_id ?? `comment-${Date.now()}`,
        content: comment?.content ?? comment?.comment_content ?? "",
        author: comment?.author ?? comment?.fullname ?? comment?.username ?? "You",
        date: comment?.date ?? formatDateDisplay(comment?.created_at),
        replies: repliesRaw.map(normalizeReply),
      };
    }

    async function fetchRepliesForComment(commentId) {
      if (!commentId) return [];
      try {
        const response = await api.get(`/bini/comments/${commentId}/reply`);
        const data = response?.data;
        const replies = Array.isArray(data) ? data : (Array.isArray(data?.replies) ? data.replies : []);
        return replies.map(normalizeReply);
      } catch (_) {
        return [];
      }
    }

    async function hydrateReplies(comments) {
      const safeComments = Array.isArray(comments) ? comments : [];
      const hydrated = await Promise.all(
        safeComments.map(async (comment) => {
          if (Array.isArray(comment.replies) && comment.replies.length > 0) return comment;
          const replies = await fetchRepliesForComment(comment.id);
          return { ...comment, replies };
        }),
      );
      return hydrated;
    }

    let currentComments = [];

    function renderComments(comments) {
      currentComments = Array.isArray(comments) ? comments : [];
      commentsListEl.innerHTML = "";
      if (!comments.length) {
        commentsListEl.innerHTML = `<div class="no-comments">Be the first to comment on this thread.</div>`;
        return;
      }

      comments.forEach((comment) => {
        const commentEl = document.createElement("div");
        commentEl.className = "comment-item";
        commentEl.innerHTML = `
          <div class="comment-meta"><strong>${comment.author || "You"}</strong> &middot; <span class="comment-date">${comment.date || ""}</span></div>
          <div class="comment-body">${escapeHtml(comment.content)}</div>
          <div class="comment-actions"><button class="reply-btn btn-link" data-id="${comment.id}">Reply</button></div>
          <div class="replies-container"></div>
        `;

        const repliesContainer = commentEl.querySelector(".replies-container");
        if (comment.replies && comment.replies.length) {
          comment.replies.forEach((r) => {
            const rEl = document.createElement("div");
            rEl.className = "reply-item";
            rEl.innerHTML = `<div class="reply-meta"><strong>${r.author || "You"}</strong> &middot; <span class="reply-date">${r.date || ""}</span></div><div class="reply-body">${escapeHtml(r.content)}</div>`;
            repliesContainer.appendChild(rEl);
          });
        }

        commentsListEl.appendChild(commentEl);
      });

      commentsListEl.querySelectorAll(".reply-btn").forEach((btn) => {
        btn.addEventListener("click", () => toggleReplyForm(btn.dataset.id));
      });
    }

    function toggleReplyForm(commentId) {
      const btn = commentsListEl.querySelector(
        `.reply-btn[data-id="${commentId}"]`,
      );
      if (!btn) return;
      const commentEl = btn.closest(".comment-item");
      let form = commentEl.querySelector(".reply-form");
      if (form) {
        form.remove();
        return;
      }

      form = document.createElement("form");
      form.className = "reply-form";
      form.innerHTML = `
        <textarea name="reply" placeholder="Write a reply..." rows="2"></textarea>
        <div><button type="submit">Reply</button></div>
      `;

      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const content = form
          .querySelector('textarea[name="reply"]')
          .value.trim();
        if (!content) return;
        await submitReply(commentId, content);
        form.remove();
        await loadComments();
      });

      commentEl.appendChild(form);
      form.querySelector("textarea").focus();
    }

    async function submitReply(commentId, content) {
      const comments = (currentComments.length ? currentComments : readLocalComments().map(normalizeComment)).map(normalizeComment);
      const idx = comments.findIndex((c) => String(c.id) === String(commentId));
      if (idx !== -1) {
        comments[idx].replies = comments[idx].replies || [];
        comments[idx].replies.push({
          id: Date.now(),
          content,
          author: "You",
          date: formatUserTimestamp(new Date()),
        });
        saveLocalComments(comments);
        currentComments = comments;
      }

      try {
        const resp = await api.post(`/bini/comments/reply/${commentId}`, { content });
        return resp.data;
      } catch (err) {
        return null;
      }
    }

    async function submitComment(content) {
      const optimisticComment = {
        id: Date.now(),
        content,
        author: "You",
        date: formatUserTimestamp(new Date()),
        replies: [],
      };
      const localComments = readLocalComments();
      localComments.unshift(optimisticComment);
      saveLocalComments(localComments);

      try {
        const token = getSessionToken(getActiveSiteSlug());
        const result = await apiCreateComment(threadId, content, token);
        return result;
      } catch (err) {
        return optimisticComment;
      }
    }

    async function loadComments() {
      let comments = [];
      const localComments = readLocalComments().map(normalizeComment);
      try {
        const token = getSessionToken(getActiveSiteSlug());
        const apiComments = await apiGetComments(
          threadId,
          token,
        );
        const apiList = (Array.isArray(apiComments) ? apiComments : []).map(normalizeComment);

        // Keep locally cached comments visible even after exit/reopen.
        const merged = [...apiList];
        const seen = new Set(apiList.map((c) => String(c.id ?? "")));
        localComments.forEach((local) => {
          const key = String(local.id ?? "");
          if (!seen.has(key)) {
            merged.unshift(local);
            return;
          }
          const apiComment = merged.find((item) => String(item.id ?? '') === key);
          if (apiComment && Array.isArray(local.replies) && local.replies.length > 0) {
            const existingReplyIds = new Set((apiComment.replies || []).map((reply) => String(reply.id ?? '')));
            const localOnlyReplies = local.replies.filter((reply) => !existingReplyIds.has(String(reply.id ?? '')));
            apiComment.replies = [...(apiComment.replies || []), ...localOnlyReplies];
          }
        });
        comments = await hydrateReplies(merged);
        saveLocalComments(comments);
      } catch (err) {
        comments = await hydrateReplies(localComments);
        saveLocalComments(comments);
      }
      renderComments(comments || []);
    }

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ta = createForm.querySelector('textarea[name="comment"]');
      const content = ta.value.trim();
      if (!content) return;
      await submitComment(content);
      ta.value = "";
      await loadComments();
    });

    loadComments();
  } catch (error) {
    console.error("Error loading thread topic:", error);
    root.innerHTML = `
      <div class="thread-topic-container">
        <button type="button" class="thread-topic-close" aria-label="Close">&times;</button>
        <div class="thread-error">
          <h2>Thread unavailable</h2>
          <p>Something went wrong while opening this thread.</p>
          <a href="/bini">Go back to home</a>
        </div>
      </div>
    `;
    attachCloseButton(root);
  }
}
