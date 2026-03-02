export default function Member(root, data = {}) {
  const defaultMembers = [
    {
      name: "Aiah",
      role: "Main Rapper • Visual • Sub-Vocalist",
      bio: "Aiah is known for her charismatic stage presence and sharp rap delivery.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010180_m4oshc.jpg",
    },
    {
      name: "Gwen",
      role: "Lead Vocalist • Lead Rapper",
      bio: "Gwen's versatility allows her to switch seamlessly between powerful vocals and rap verses.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010183_wlbruk.jpg",
    },
    {
      name: "Maloi",
      role: "Main Vocalist • Lead Dancer • Lead Rapper",
      bio: "Maloi's powerful voice and emotional delivery have captured the hearts of fans.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010182_fv8nxb.jpg",
    },
    {
      name: "Colet",
      role: "Main Vocalist",
      bio: "Colet's wide vocal range and stability make her one of the group's strongest singers.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759408350/1000010181_km87z1.jpg",
    },
    {
      name: "Mikha",
      role: "Main Rapper • Lead Dancer • Visual",
      bio: "Mikha's sharp dance moves and confident rap lines add edge to BINI's performances.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407989/1000010185_cdbpgv.jpg",
    },
    {
      name: "Stacey",
      role: "Lead Dancer • Sub Vocalist • Sub Rapper",
      bio: "Stacey brings energy and precision to every stage. Her bubbly personality off-stage balances her fierce performance persona.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407989/1000010184_fnzqes.jpg",
    },
    {
      name: "Sheena",
      role: "Main Dancer • Sub-Vocalist",
      bio: "Sheena's dance skills are top-notch, often leading rehearsals and creating freestyle pieces.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010187_er3rop.jpg",
    },
    {
      name: "Jhoanna",
      role: "Leader • Lead Vocalist • Lead Rapper",
      bio: "As the leader, Jhoanna ensures the group stays united and focused.",
      img: "https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407990/1000010186_ppfcpb.jpg",
    },
  ];

  const members = Array.isArray(data?.members) && data.members.length > 0
    ? data.members.map((member) => ({
      name: member?.name || "Unnamed",
      role: member?.role || "",
      bio: member?.description || "",
      img: member?.image_profile || member?.image || "",
    }))
    : defaultMembers;

  root.innerHTML += `
      <h4 class="section-title">Meet the Members</h4>
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
      </section>
  `;
}
