import '../../../styles/Admin_styles//Messaging.css';

export default function createMessaging() {
  const section = document.createElement('section');
  section.id = 'messaging';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="section-header">
      <h2>Messaging System</h2>
    </div>

    <div class="messaging-container">
      <!-- Sidebar -->
      <div class="conversation-sidebar">
        <div class="conversation-search">
          <input type="text" placeholder="Search conversations..." id="messageSearch">
        </div>
        <div class="conversation-list" id="conversationList">
          <div class="conversation-item active">
            <div class="conversation-avatar">👤</div>
            <div class="conversation-details">
              <div class="conversation-header">
                <h4>Miko Aldrin</h4>
                <span class="conversation-time">2m ago</span>
              </div>
              <p>Hello, I have a question about my order...</p>
            </div>
          </div>

          <div class="conversation-item">
            <div class="conversation-avatar">👤</div>
            <div class="conversation-details">
              <div class="conversation-header">
                <h4>Aaron Cruz</h4>
                <span class="conversation-time">5m ago</span>
              </div>
              <p>Is my package already shipped?</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat area -->
      <div class="chat-area">
        <div class="chat-header">
          <div class="chat-user">
            <span class="user-avatar">👤</span>
            <span class="user-name">Miko Aldrin</span>
            <span class="user-status online">Online</span>
          </div>
        </div>

        <div class="chat-messages" id="messagesList"></div>

        <div class="chat-input-container">
          <div class="message-input-wrapper">
            <textarea 
              id="messageInput"
              placeholder="Type a message..."
              rows="1"
            ></textarea>
            <button class="btn-icon btn-send" id="sendMessageBtn">➤</button>
          </div>
        </div>
      </div>
    </div>
  `;

  function setupMessageSearch() {
    const input = section.querySelector("#messageSearch");
    input?.addEventListener("input", filterMessages);
  }

  function setupMessaging() {
    const input = section.querySelector("#messageInput");
    const sendBtn = section.querySelector("#sendMessageBtn");

    if (!input || !sendBtn) return;

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function filterMessages() {
    const value = section.querySelector("#messageSearch").value.toLowerCase();

    section.querySelectorAll(".conversation-item").forEach(conv => {
      const name = conv.querySelector("h4").textContent.toLowerCase();
      const msg = conv.querySelector("p").textContent.toLowerCase();

      conv.style.display =
        name.includes(value) || msg.includes(value) ? "" : "none";
    });
  }

  function sendMessage() {
    const input = section.querySelector("#messageInput");
    const text = input.value.trim();
    if (!text) return;

    const list = section.querySelector("#messagesList");

    list.insertAdjacentHTML("beforeend", `
      <div class="message outgoing">
        <p>${text}</p>
        <small>
          ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </small>
      </div>
    `);

    input.value = "";
    list.scrollTop = list.scrollHeight;
  }

  function initMessaging() {
    setupMessageSearch();
    setupMessaging();
  }

  initMessaging();

  return section;
}
