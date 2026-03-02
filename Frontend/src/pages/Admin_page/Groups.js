import GroupsComponent from '../../components/Admin_components/Components//GroupManagement.js';

export default function Groups() {
  const root = this.root;
  root.innerHTML = '';

  const groups = GroupsComponent();
  root.appendChild(groups);
}
