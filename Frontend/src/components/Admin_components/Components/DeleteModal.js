import '../../../styles/Admin_styles//DeleteModal.css';

export default class DeleteModal {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'modal';
    this.element.id = 'deleteModal';
    this.element.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Delete Confirmation</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>
          <div class="modal-item-preview">
            <strong>Item:</strong> <span id="deleteItemName">Item Name</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelDeleteBtn">Cancel</button>
          <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
        </div>
      </div>
    `;
  }

  render() {
    this.initDeleteModal();
    return this.element;
  }

  initDeleteModal() {
    console.log("[Delete modal ready]");

    const closeBtn = this.element.querySelector(".modal-close");
    const cancelBtn = this.element.querySelector("#cancelDeleteBtn");
    const confirmBtn = this.element.querySelector("#confirmDeleteBtn");

    [closeBtn, cancelBtn].forEach(btn => {
      btn?.addEventListener("click", () => {
        this.element.style.display = "none";
        console.log("[Delete modal closed]");
      });
    });

    confirmBtn?.addEventListener("click", () => {
      console.log("[Delete confirmed]");
      this.element.style.display = "none";
    });
  }
}
