export default function Member(root, data = {}) {
  const members = Array.isArray(data?.members) && data.members.length > 0
    ? data.members.map((member) => ({
      name: member?.name || "Unnamed",
      role: member?.role || "",
      bio: member?.description || "",
      img: member?.image_profile || member?.image || "",
    }))
    : [];

  root.innerHTML += `
      <h4 class="section-title">About Natin</h4>
      <section class="members-grid">
        ${members
          .map(
            (m) => `
              <div class="flip-card">
                <div class="flip-card-inner">
                  <div class="flip-card-front" aria-label="${m.name}">
                    <img class="member-photo" src="${m.img || '/placeholder.svg?height=320&width=220'}" alt="${m.name}">
                    <p class="title">${m.name}</p>
                  </div>
                  <div class="flip-card-back">
                    <p class="title">${m.role}</p>
                    <p>${m.bio}</p>
                  </div>
                </div>
              </div>
            `
          )
          .join("")}
        ${members.length === 0 ? '<p class="section-description">No members available for this community yet.</p>' : ""}
      </section>
  `;
}
