import fetchThreads from "../../services/bini_services/thread/thread-api.js";
import {
  getComments as apiGetComments,
  createComment as apiCreateComment,
} from "../../services/bini_services/post/create-comment-api.js";
import api from "../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken } from "../../lib/site-context.js";
import { formatFriendlyDateTime, formatUserTimestamp } from "../../utils/user-time.js";
import {
  sanitizeCommunityText,
  validateCommunityText,
} from "../../utils/community-text.js";

const COMMUNITY_TEXT_MAX_LENGTH = 1000;

function navigateHome() {
  history.back();
}

function attachCloseButton(root) {
  const btn = root.querySelector(".thread-topic-close");
  if (btn) btn.addEventListener("click", navigateHome);
}

function formatThreadHeaderDate(value) {
  if (!value) return "";
  return (
    formatFriendlyDateTime(value) ||
    formatUserTimestamp(value) ||
    sanitizeCommunityText(value, { maxLength: 80 }) ||
    ""
  );
}

function formatCommentTimestamp(value) {
  if (!value) return "";
  return (
    formatUserTimestamp(value) ||
    formatFriendlyDateTime(value) ||
    sanitizeCommunityText(value, { maxLength: 80 }) ||
    ""
  );
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
            <div class="thread-topic-date">${formatThreadHeaderDate(thread.date || thread.created_at)}</div>
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
                <textarea name="comment" class="create-comment-input" rows="3" placeholder="Write a comment..." maxlength="${COMMUNITY_TEXT_MAX_LENGTH}" style="width:100%;padding:8px;resize:vertical;"></textarea>
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

    const legacyCommentsKey = `thread-comments-${threadId}`;
    const pendingCommentsKey = `thread-comments-pending-${threadId}`;

    sessionStorage.removeItem(legacyCommentsKey);

    function savePendingState(state) {
      const safeState = {
        comments: Array.isArray(state?.comments) ? state.comments : [],
        replies: Array.isArray(state?.replies) ? state.replies : [],
      };
      sessionStorage.setItem(pendingCommentsKey, JSON.stringify(safeState));
    }

    function readPendingState() {
      const raw = sessionStorage.getItem(pendingCommentsKey);
      if (!raw) {
        return { comments: [], replies: [] };
      }
      try {
        const parsed = JSON.parse(raw);
        return {
          comments: Array.isArray(parsed?.comments) ? parsed.comments : [],
          replies: Array.isArray(parsed?.replies) ? parsed.replies : [],
        };
      } catch {
        return { comments: [], replies: [] };
      }
    }

    function createPendingId(prefix) {
      return `pending-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function normalizeText(value) {
      return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    function areCloseInTime(firstValue, secondValue) {
      if (!firstValue || !secondValue) return true;
      const firstTime = new Date(firstValue).getTime();
      const secondTime = new Date(secondValue).getTime();
      if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return true;
      return Math.abs(firstTime - secondTime) <= 10 * 60 * 1000;
    }

    function normalizeReply(reply) {
      return {
        id: reply?.id ?? reply?.reply_id ?? reply?.comment_id ?? `reply-${Date.now()}`,
        content: sanitizeCommunityText(reply?.content ?? reply?.reply_content ?? ""),
        author: reply?.author ?? reply?.fullname ?? reply?.username ?? "You",
        date: reply?.date ?? formatCommentTimestamp(reply?.created_at ?? reply?.createdAt),
        createdAt: reply?.createdAt ?? reply?.created_at ?? null,
        pending: Boolean(reply?.pending),
      };
    }

    function normalizeComment(comment) {
      const repliesRaw = Array.isArray(comment?.replies) ? comment.replies : [];
      return {
        ...comment,
        id: comment?.id ?? comment?.comment_id ?? `comment-${Date.now()}`,
        content: sanitizeCommunityText(comment?.content ?? comment?.comment_content ?? ""),
        author: comment?.author ?? comment?.fullname ?? comment?.username ?? "You",
        date: comment?.date ?? formatCommentTimestamp(comment?.created_at ?? comment?.createdAt),
        createdAt: comment?.createdAt ?? comment?.created_at ?? null,
        pending: Boolean(comment?.pending),
        replies: repliesRaw.map(normalizeReply),
      };
    }

    function buildPendingComment(entry) {
      return normalizeComment({
        id: entry?.tempId,
        content: entry?.content,
        author: "You",
        createdAt: entry?.createdAt,
        pending: true,
        replies: [],
      });
    }

    function buildPendingReply(entry) {
      return normalizeReply({
        id: entry?.tempId,
        content: entry?.content,
        author: "You",
        createdAt: entry?.createdAt,
        pending: true,
      });
    }

    function matchesPendingComment(serverComment, pendingComment) {
      return (
        normalizeText(serverComment?.content) === normalizeText(pendingComment?.content) &&
        areCloseInTime(serverComment?.createdAt, pendingComment?.createdAt)
      );
    }

    function matchesPendingReply(serverReply, pendingReply) {
      return (
        normalizeText(serverReply?.content) === normalizeText(pendingReply?.content) &&
        areCloseInTime(serverReply?.createdAt, pendingReply?.createdAt)
      );
    }

    function mergePendingState(apiComments, pendingState) {
      const mergedComments = (Array.isArray(apiComments) ? apiComments : []).map((comment) => ({
        ...normalizeComment(comment),
        replies: (Array.isArray(comment?.replies) ? comment.replies : []).map(normalizeReply),
      }));
      const unresolved = { comments: [], replies: [] };

      [...pendingState.comments].reverse().forEach((entry) => {
        const pendingComment = buildPendingComment(entry);
        const alreadySynced = mergedComments.some((comment) =>
          matchesPendingComment(comment, pendingComment),
        );

        if (alreadySynced) return;
        mergedComments.unshift(pendingComment);
        unresolved.comments.unshift(entry);
      });

      pendingState.replies.forEach((entry) => {
        const parentComment = mergedComments.find(
          (comment) => String(comment.id) === String(entry.commentId),
        );

        if (!parentComment) {
          unresolved.replies.push(entry);
          return;
        }

        const currentReplies = Array.isArray(parentComment.replies)
          ? parentComment.replies.map(normalizeReply)
          : [];
        const pendingReply = buildPendingReply(entry);
        const alreadySynced = currentReplies.some((reply) =>
          matchesPendingReply(reply, pendingReply),
        );

        if (!alreadySynced) {
          currentReplies.push(pendingReply);
          unresolved.replies.push(entry);
        }

        parentComment.replies = currentReplies;
      });

      return { comments: mergedComments, pendingState: unresolved };
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
      currentComments = Array.isArray(comments) ? comments.map(normalizeComment) : [];
      commentsListEl.innerHTML = "";
      if (!currentComments.length) {
        commentsListEl.innerHTML = `<div class="no-comments">Be the first to comment on this thread.</div>`;
        return;
      }

      currentComments.forEach((comment) => {
        const commentEl = document.createElement("div");
        commentEl.className = `comment-item${comment.pending ? " is-pending" : ""}`;
        commentEl.innerHTML = `
          <div class="comment-meta"><strong>${comment.author || "You"}</strong> &middot; <span class="comment-date">${comment.date || ""}</span></div>
          <div class="comment-body">${escapeHtml(comment.content)}</div>
          ${comment.pending ? "" : `<div class="comment-actions"><button class="reply-btn btn-link" data-id="${comment.id}">Reply</button></div>`}
          <div class="replies-container"></div>
        `;

        const repliesContainer = commentEl.querySelector(".replies-container");
        if (comment.replies && comment.replies.length) {
          comment.replies.forEach((r) => {
            const rEl = document.createElement("div");
            rEl.className = `reply-item${r.pending ? " is-pending" : ""}`;
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
        <textarea name="reply" placeholder="Write a reply..." rows="2" maxlength="${COMMUNITY_TEXT_MAX_LENGTH}"></textarea>
        <div><button type="submit">Reply</button></div>
      `;

      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const replyValidation = validateCommunityText(
          form.querySelector('textarea[name="reply"]').value,
          {
            label: "Reply",
            maxLength: COMMUNITY_TEXT_MAX_LENGTH,
          },
        );
        if (!replyValidation.isValid) {
          alert(replyValidation.errors[0]);
          return;
        }
        const content = replyValidation.sanitized;
        form.querySelector('textarea[name="reply"]').value = content;
        await submitReply(commentId, content);
        form.remove();
        await loadComments();
      });

      commentEl.appendChild(form);
      form.querySelector("textarea").focus();
    }

    async function submitReply(commentId, content) {
      const replyValidation = validateCommunityText(content, {
        label: "Reply",
        maxLength: COMMUNITY_TEXT_MAX_LENGTH,
      });
      if (!replyValidation.isValid) {
        return null;
      }

      const pendingReply = {
        tempId: createPendingId("reply"),
        commentId,
        content: replyValidation.sanitized,
        createdAt: new Date().toISOString(),
      };
      const pendingState = readPendingState();
      savePendingState({
        comments: pendingState.comments,
        replies: [...pendingState.replies, pendingReply],
      });

      const nextComments = currentComments.map((comment) => {
        if (String(comment.id) !== String(commentId)) return comment;
        return {
          ...normalizeComment(comment),
          replies: [...(Array.isArray(comment.replies) ? comment.replies : []), buildPendingReply(pendingReply)],
        };
      });
      renderComments(nextComments);

      try {
        const resp = await api.post(`/bini/comments/reply/${commentId}`, {
          content: replyValidation.sanitized,
        });
        return resp.data;
      } catch (err) {
        return null;
      }
    }

    async function submitComment(content) {
      const commentValidation = validateCommunityText(content, {
        label: "Comment",
        maxLength: COMMUNITY_TEXT_MAX_LENGTH,
      });
      if (!commentValidation.isValid) {
        return null;
      }

      const optimisticComment = {
        tempId: createPendingId("comment"),
        content: commentValidation.sanitized,
        createdAt: new Date().toISOString(),
      };
      const pendingState = readPendingState();
      savePendingState({
        comments: [optimisticComment, ...pendingState.comments],
        replies: pendingState.replies,
      });
      renderComments([buildPendingComment(optimisticComment), ...currentComments]);

      try {
        const token = getSessionToken(getActiveSiteSlug());
        const result = await apiCreateComment(threadId, commentValidation.sanitized, token);
        return result;
      } catch (err) {
        return optimisticComment;
      }
    }

    async function loadComments() {
      let comments = [];
      const pendingState = readPendingState();
      try {
        const token = getSessionToken(getActiveSiteSlug());
        const apiComments = await apiGetComments(
          threadId,
          token,
        );
        const apiList = (Array.isArray(apiComments) ? apiComments : []).map(normalizeComment);
        const hydratedComments = await hydrateReplies(apiList);
        const merged = mergePendingState(hydratedComments, pendingState);
        comments = merged.comments;
        savePendingState(merged.pendingState);
      } catch (err) {
        const merged = mergePendingState([], pendingState);
        comments = merged.comments;
        savePendingState(merged.pendingState);
      }
      renderComments(comments || []);
    }

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ta = createForm.querySelector('textarea[name="comment"]');
      const commentValidation = validateCommunityText(ta.value, {
        label: "Comment",
        maxLength: COMMUNITY_TEXT_MAX_LENGTH,
      });
      if (!commentValidation.isValid) {
        alert(commentValidation.errors[0]);
        return;
      }
      const content = commentValidation.sanitized;
      ta.value = content;
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
