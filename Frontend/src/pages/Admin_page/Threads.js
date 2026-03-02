import AdminDashboard from "../../layouts/Admin_layout/Admin-Dashboard.js";
import "../../styles/Admin_styles/Threads.css";
import ThreadsComponent from "../../components/Admin_components/Components/Threads.js";

export default function Threads() {
  console.log("🚀 Threads page is being loaded...");

  const root = this.root;
  root.innerHTML = "";

  // Setup layout and get main content area
  const layout = AdminDashboard(root);

  // Clear main content area and render threads
  layout.main.innerHTML = "";

  console.log("📦 Adding Threads component to layout...");
  layout.main.appendChild(ThreadsComponent());

  console.log("✅ Threads page loaded successfully!");
}
