function stripDangerousTags(value) {
  let text = String(value ?? "");
  if (!text) return "";

  const dangerousBlockPatterns = [
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /<style\b[^>]*>[\s\S]*?<\/style>/gi,
    /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
    /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object\b[^>]*>[\s\S]*?<\/object>/gi,
    /<embed\b[^>]*>[\s\S]*?<\/embed>/gi,
    /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
  ];

  dangerousBlockPatterns.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  return text.replace(
    /<\/?(?:script|style|noscript|iframe|object|embed|link|meta|svg|math)[^>]*\/?>/gi,
    " ",
  );
}

function stripCssRuleBlocks(value) {
  return String(value ?? "").replace(/([^{}]{1,160})\{([^{}]{1,600})\}/g, (match, selector, declarations) => {
    const normalizedSelector = String(selector || "").trim();
    const normalizedDeclarations = String(declarations || "").trim();
    const looksLikeCssSelector =
      /(^|[\s,>+~])(?:[.#][\w-]+|(?:body|html|main|div|span|section|header|footer|nav|button|input|textarea|img|svg|path|p|a|h[1-6])\b)/i
        .test(normalizedSelector);
    const looksLikeCssDeclaration =
      /:\s*[^;{}]+(?:;|$)/.test(normalizedDeclarations) &&
      (
        normalizedDeclarations.includes(";") ||
        normalizedDeclarations.includes("!important") ||
        normalizedDeclarations.includes("--")
      );

    return looksLikeCssSelector && looksLikeCssDeclaration ? " " : match;
  });
}

function stripCodeLikePayloads(value) {
  return stripCssRuleBlocks(String(value ?? ""))
    .replace(/\b(?:alert|prompt|confirm|eval)\s*\([^)]*\)\s*;?/gi, " ")
    .replace(/\bjavascript\s*:/gi, " ")
    .replace(/\bdata\s*:\s*text\/html/gi, " ")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, " ");
}

function stripExcessiveCombiningMarks(value) {
  const source = String(value ?? "").normalize("NFD");
  let output = "";
  let pendingMarks = "";

  const flushMarks = () => {
    if (pendingMarks.length === 1) {
      output += pendingMarks;
    }
    pendingMarks = "";
  };

  for (const char of source) {
    if (/\p{M}/u.test(char)) {
      pendingMarks += char;
      continue;
    }

    flushMarks();
    output += char;
  }

  flushMarks();
  return output.normalize("NFC");
}

function stripHtmlToText(value) {
  const html = stripCodeLikePayloads(stripDangerousTags(value));
  if (!html) return "";

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript, iframe, object, embed, link, meta, svg, math")
      .forEach((node) => node.remove());
    return stripCodeLikePayloads(doc.body.textContent || "");
  }

  return stripCodeLikePayloads(html.replace(/<[^>]*>/g, " "));
}

export function sanitizeCommunityText(value, options = {}) {
  const { maxLength = null } = options || {};
  let text = stripExcessiveCombiningMarks(stripHtmlToText(value))
    .replace(/\s+/g, " ")
    .trim();

  if (Number.isFinite(maxLength) && maxLength > 0) {
    text = text.slice(0, maxLength);
  }

  return text;
}

export function validateCommunityText(value, options = {}) {
  const { label = "Content", maxLength = null } = options || {};
  const sanitized = sanitizeCommunityText(value, { maxLength });
  const errors = [];

  if (!sanitized) {
    errors.push(`${label} is required.`);
  }

  return {
    sanitized,
    errors,
    isValid: errors.length === 0,
  };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function resolveCommunitySubmissionError(error, fallbackMessage = "Unable to submit content.") {
  const payload = error?.response?.data || {};
  const rawMessage = String(
    payload?.error ||
    payload?.message ||
    error?.message ||
    "",
  ).trim();
  const isModerationBlocked =
    Boolean(payload?.warning) ||
    Boolean(payload?.moderation) ||
    /suspicious words detected/i.test(rawMessage);

  if (isModerationBlocked) {
    return "Bad detected words, please try another.";
  }

  return rawMessage || fallbackMessage;
}
