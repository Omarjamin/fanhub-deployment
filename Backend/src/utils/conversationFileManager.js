import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base path for all archived message files.
const BINI_COMMUNITY_PATH = path.join(__dirname, "../../BiniCommunity");

function normalizeCommunity(communityType = "") {
  const normalized = String(communityType || "").trim().toLowerCase();
  if (!normalized) return "bini";
  return normalized.replace(/[^a-z0-9_-]/g, "") || "bini";
}

function getCommunityFolderPath(communityType = "") {
  const folder = normalizeCommunity(communityType);
  return path.join(BINI_COMMUNITY_PATH, folder);
}

// Ensure both base folder and per-community folder exist.
function ensureBiniCommunityFolder(communityType = "") {
  if (!fs.existsSync(BINI_COMMUNITY_PATH)) {
    fs.mkdirSync(BINI_COMMUNITY_PATH, { recursive: true });
    console.log("Created BiniCommunity folder");
  }

  const communityPath = getCommunityFolderPath(communityType);
  if (!fs.existsSync(communityPath)) {
    fs.mkdirSync(communityPath, { recursive: true });
    console.log(`Created community message folder: ${communityPath}`);
  }

  return communityPath;
}

/**
 * Gets the filename for a conversation between two users.
 * Uses sorted user IDs so sender/receiver order doesn't matter.
 */
function getConversationFilename(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort((a, b) => a - b);
  return `${sortedIds[0]}_${sortedIds[1]}.txt`;
}

/**
 * Saves one message line to the conversation file in BiniCommunity/<community>/.
 */
async function saveMessageToFile(
  senderId,
  receiverId,
  content,
  timestamp,
  communityType = "",
) {
  try {
    const communityPath = ensureBiniCommunityFolder(communityType);
    const filename = getConversationFilename(senderId, receiverId);
    const filePath = path.join(communityPath, filename);

    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const messageEntry = `[${formattedDate}] User ${senderId}: ${content}\n`;
    const fileExists = fs.existsSync(filePath);

    fs.appendFileSync(filePath, messageEntry, "utf8");

    if (!fileExists) {
      console.log(`Created new conversation file: ${filename}`);
    } else {
      console.log(`Appended message to conversation file: ${filename}`);
    }
  } catch (error) {
    console.error("Error saving message to file:", error);
    // Do not throw to avoid breaking message send flow.
  }
}

/**
 * Returns raw conversation file contents for a user pair in a community.
 */
async function getConversationFromFile(userId1, userId2, communityType = "") {
  try {
    const communityPath = ensureBiniCommunityFolder(communityType);
    const filename = getConversationFilename(userId1, userId2);
    const filePath = path.join(communityPath, filename);

    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    return "";
  } catch (error) {
    console.error("Error reading conversation file:", error);
    return "";
  }
}

/**
 * Exports an array of DB messages into grouped text files in BiniCommunity/<community>/.
 */
async function exportAllConversations(messages, communityType = "") {
  try {
    const communityPath = ensureBiniCommunityFolder(communityType);
    const conversations = new Map();

    messages.forEach((message) => {
      const { sender_id, receiver_id, content, created_at } = message;
      const filename = getConversationFilename(sender_id, receiver_id);

      if (!conversations.has(filename)) {
        conversations.set(filename, []);
      }

      conversations.get(filename).push({
        sender_id,
        receiver_id,
        content,
        created_at,
      });
    });

    conversations.forEach((msgs) => {
      msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    let filesCreated = 0;
    let filesUpdated = 0;
    let totalMessages = 0;

    for (const [filename, msgs] of conversations.entries()) {
      const filePath = path.join(communityPath, filename);
      const fileExists = fs.existsSync(filePath);

      let fileContent = "";
      msgs.forEach((msg) => {
        const date = new Date(msg.created_at);
        const formattedDate = date.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        fileContent += `[${formattedDate}] User ${msg.sender_id}: ${msg.content}\n`;
        totalMessages++;
      });

      fs.writeFileSync(filePath, fileContent, "utf8");

      if (fileExists) filesUpdated++;
      else filesCreated++;
    }

    return {
      success: true,
      filesCreated,
      filesUpdated,
      totalConversations: conversations.size,
      totalMessages,
    };
  } catch (error) {
    console.error("Error exporting conversations:", error);
    throw error;
  }
}

export {
  saveMessageToFile,
  getConversationFromFile,
  ensureBiniCommunityFolder,
  exportAllConversations,
};
