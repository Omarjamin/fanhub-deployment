import '../../../styles/Admin_styles/GroupManagement.css';
import { sanitizeAdminSearch } from '../../../utils/admin-form-validation.js';

export default function createGroupManagement() {
  const section = document.createElement('section');
  section.id = 'groups';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="groups-wrapper">

      <!-- MAIN CARD -->
      <div class="group-management">
        <div class="section-header">
          <h2>Group Management</h2>
          <button class="add-group-btn" id="createGroupBtn">+ Create Group</button>
        </div>

        <div class="filters">
          <input 
            type="text" 
            placeholder="Search groups..." 
            class="filter-input" 
            id="groupSearch"
            maxlength="80"
          >
          <select class="filter-select" id="groupStatusFilter">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        <!-- ONLY THE GRID GOES HERE -->
        <div class="groups-grid" id="groupsGrid"></div>
      </div>

      <!-- MODALS ARE NOW OUTSIDE THE CARD -->
      <div class="modal" id="editAllModal">
        <div class="modal-content">
          <h3>Edit Group</h3>
          <p>Editing group: <span id="editingGroupId"></span></p>
          <button class="btn" id="closeEditModal">Close</button>
        </div>
      </div>

      <div class="modal" id="disbandModal">
        <div class="modal-content">
          <h3>Disband Group</h3>
          <p>Are you sure you want to disband group <span id="disbandingGroupId"></span>?</p>
          <button class="btn btn-danger" id="confirmDisbandBtn">Yes</button>
          <button class="btn" id="closeDisbandModal">Cancel</button>
        </div>
      </div>

    </div>
  `;

  let currentEditingGroupId = null;
  let currentDisbandingGroupId = null;

  const mockGroups = [
    {
      id: 1,
      name: "BINI Fans PH",
      members: 2345,
      description: "Official BINI fan community in the Philippines",
      posts: 456,
      active: "Today",
      status: "active",
      privacy: "public",
    },
    {
      id: 2,
      name: "Aiah Supporters",
      members: 560,
      description: "Supporters of Aiah",
      posts: 120,
      active: "Yesterday",
      status: "inactive",
      privacy: "private",
    },
  ];

  function loadGroups(groups = mockGroups) {
    const grid = section.querySelector("#groupsGrid");
    grid.innerHTML = groups.map(g => `
      <div class="group-card" data-group-id="${g.id}">
        <div class="group-header">
          <img src="/placeholder.svg" class="group-avatar">
          <div class="group-info">
            <h3>${g.name}</h3>
            <p class="group-members">${g.members.toLocaleString()} members</p>
          </div>
        </div>

        <p class="group-description">${g.description}</p>

        <div class="group-stats">
          <span>Posts: ${g.posts}</span>
          <span>Active: ${g.active}</span>
        </div>

        <div class="group-actions">
          <button class="btn btn-edit-all edit-btn" data-id="${g.id}">Edit All</button>
          <button class="btn btn-disband disband-btn" data-id="${g.id}">Disband</button>
          <button class="btn btn-edit">Edit</button>
          <button class="btn btn-delete">Delete</button>
        </div>  
      </div>
    `).join("");
  }

  function filterGroups() {
    const searchInput = section.querySelector("#groupSearch");
    const statusInput = section.querySelector("#groupStatusFilter");
    const sanitizedSearch = sanitizeAdminSearch(searchInput?.value || "", { maxLength: 80 });
    if (searchInput && searchInput.value !== sanitizedSearch) {
      searchInput.value = sanitizedSearch;
    }

    const search = sanitizedSearch.toLowerCase();
    const status = String(statusInput?.value || "").trim().toLowerCase();

    const filteredGroups = mockGroups.filter((group) => {
      const name = String(group.name || "").toLowerCase();
      const description = String(group.description || "").toLowerCase();
      const groupStatus = String(group.status || "").toLowerCase();
      const privacy = String(group.privacy || "").toLowerCase();

      const matchesSearch = !search || name.includes(search) || description.includes(search);
      const matchesStatus = !status || groupStatus === status || privacy === status;
      return matchesSearch && matchesStatus;
    });

    loadGroups(filteredGroups);
  }

  function openModal(id) {
    section.querySelector(`#${id}`).classList.add("active");
  }

  function closeModal(id) {
    section.querySelector(`#${id}`).classList.remove("active");
  }

  function setupGroupActions() {
    section.addEventListener("click", e => {
      const editBtn = e.target.closest(".edit-btn");
      const disbandBtn = e.target.closest(".disband-btn");

      if (editBtn) {
        currentEditingGroupId = editBtn.dataset.id;
        section.querySelector("#editingGroupId").textContent = currentEditingGroupId;
        openModal("editAllModal");
      }

      if (disbandBtn) {
        currentDisbandingGroupId = disbandBtn.dataset.id;
        section.querySelector("#disbandingGroupId").textContent = currentDisbandingGroupId;
        openModal("disbandModal");
      }
    });

    section.querySelector("#closeEditModal")
      .addEventListener("click", () => closeModal("editAllModal"));

    section.querySelector("#closeDisbandModal")
      .addEventListener("click", () => closeModal("disbandModal"));

    section.querySelector("#confirmDisbandBtn")
      .addEventListener("click", () => {
        section.querySelector(`[data-group-id="${currentDisbandingGroupId}"]`)?.remove();
        closeModal("disbandModal");
      });
  }

  function setupGroupFilters() {
    section.querySelector("#groupSearch")
      ?.addEventListener("input", filterGroups);

    section.querySelector("#groupStatusFilter")
      ?.addEventListener("change", filterGroups);
  }

  loadGroups();
  setupGroupFilters();
  setupGroupActions();
  return section;
}
