import setupThreadsFab from "../threads-fab.js";

export default function NotifHeader(root) {
  root.innerHTML = `
      <div class="notif-header">
                <h1 class="notif-title">Notifications</h1>
      </div>
  
  `;

  setupThreadsFab();
}
