import api from '../../../lib/api.js';
import { getActiveSiteSlug } from '../../../lib/site-context.js';

function resolveSiteSlug(data = {}) {
    const fromData = String(
        data?.siteSlug ||
        data?.site_slug ||
        data?.domain ||
        data?.community_type ||
        ''
    ).trim().toLowerCase();
    if (fromData) return getActiveSiteSlug(fromData) || fromData;

    const fromStorage = String(
        sessionStorage.getItem('site_slug') ||
        sessionStorage.getItem('community_type') ||
        ''
    ).trim().toLowerCase();
    if (fromStorage && fromStorage !== 'community-platform') {
        return getActiveSiteSlug(fromStorage) || fromStorage;
    }

    return getActiveSiteSlug() || 'bini';
}

function getDefaultGroupInfo(siteSlug = 'bini') {
    const label = String(siteSlug || 'bini').trim().toUpperCase();

    return {
        title: 'About',
        description: `Welcome to the ${label} community page.

This section highlights the group and its members. Member details and images are loaded based on the active community type so each generated site shows its own content.`,
        photo: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772978023/bnipics_wn5e6f.jpg',
    };
}

function getFallbackMembers() {
    alert('Failed to load member data. Displaying fallback members.');
    return [
        { name: 'AAIAH', fullName: 'Maraiah Queen Arceta', birthdate: 'January 27, 2001', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010180_m4oshc.jpg' },
        { name: 'COLET', fullName: 'Ma. Nicolette Vergara', birthdate: 'September 14, 2001', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759408350/1000010181_km87z1.jpg' },
        { name: 'GWEN', fullName: 'Gweneth L. Apuli', birthdate: 'June 19, 2003', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010183_wlbruk.jpg' },
        { name: 'MALOI', fullName: 'Mary Loi Yves Ricalde', birthdate: 'May 27, 2002', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010182_fv8nxb.jpg' },
        { name: 'JHOANNA', fullName: 'Jhoanna Christine Robles', birthdate: 'January 26, 2004', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407990/1000010186_ppfcpb.jpg' },
        { name: 'MIKHA', fullName: 'Mikhaela Janna Lim', birthdate: 'November 8, 2003', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407989/1000010185_cdbpgv.jpg' },
        { name: 'SHEENA', fullName: 'Sheena Mae Catacutan', birthdate: 'May 9, 2004', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010187_er3rop.jpg' },
        { name: 'STACEY', fullName: 'Stacey Aubrey', birthdate: 'July 13, 2003', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407989/1000010184_fnzqes.jpg' },
    ];
}

function renderAbout(root, groupInfo, membersData) {
    root.querySelectorAll('#about').forEach((node) => node.remove());

    const allItems = [groupInfo, ...membersData];
    const totalImages = allItems.length;

    root.insertAdjacentHTML('beforeend', `
        <section id="about" class="about-section">
            <div class="about-container">
                <div class="about-column about-image-column">
                    <div class="carousel-container">
                        <div class="image-stack">
                            <img src="${allItems[2]?.photo || allItems[0]?.photo || ''}" alt="Member photo" class="carousel-image back-2">
                            <img src="${allItems[1]?.photo || allItems[0]?.photo || ''}" alt="Member photo" class="carousel-image back-1">
                            <img src="${allItems[0]?.photo || ''}" alt="Group photo" class="carousel-image main">
                        </div>
                        <div class="carousel-controls">
                            <button class="carousel-arrow" type="button" data-carousel-action="previous" aria-label="Previous image">&#8249;</button>
                            <div class="pagination-indicator">1 / ${totalImages}</div>
                            <button class="carousel-arrow" type="button" data-carousel-action="next" aria-label="Next image">&#8250;</button>
                        </div>
                    </div>
                </div>
                <div class="about-column about-text-column">
                    <div class="info-container">
                        <div class="group-info" id="groupInfo">
                            <h2 class="about-title">${groupInfo.title}</h2>
                            <div class="about-content">
                                ${String(groupInfo.description || '').split('\n\n').map((para) => `<p class="about-description">${para}</p>`).join('')}
                            </div>
                        </div>
                        <div class="member-info-container" id="memberInfo" style="display: none;">
                            <div class="member-title">
                                <span class="bini-label">BINI</span>
                                <span class="member-name-display" id="memberNameDisplay">${membersData[0]?.name || ''}</span>
                            </div>
                            <div class="member-details">
                                <div class="detail-row">
                                    <span class="detail-label">Full Name</span>
                                    <span class="detail-value" id="memberFullName">${membersData[0]?.fullName || ''}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Date of Birth</span>
                                    <span class="detail-value" id="memberBirthdate">${membersData[0]?.birthdate || ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="about-column about-members-column">
                    <div class="members-list">
                        <button class="member-name active" type="button" data-index="1">ALL</button>
                        ${membersData.map((member, index) => `
                            <button class="member-name" type="button" data-index="${index + 2}">${member.name}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </section>
    `);

    root.__aboutState = {
        currentImage: 1,
        allItems,
        membersData,
        totalImages,
    };

    if (!root.__aboutBound) {
        root.addEventListener('click', (event) => {
            const aboutSection = root.querySelector('.about-section');
            if (!aboutSection || !aboutSection.contains(event.target)) {
                return;
            }

            const actionButton = event.target.closest('[data-carousel-action]');
            if (actionButton) {
                const state = root.__aboutState;
                const action = actionButton.getAttribute('data-carousel-action');

                if (action === 'previous') {
                    state.currentImage = state.currentImage > 1 ? state.currentImage - 1 : state.totalImages;
                } else if (action === 'next') {
                    state.currentImage = state.currentImage < state.totalImages ? state.currentImage + 1 : 1;
                }

                updateCarousel(root);
                return;
            }

            const memberButton = event.target.closest('.member-name');
            if (!memberButton) {
                return;
            }

            const state = root.__aboutState;
            const index = Number(memberButton.getAttribute('data-index'));
            if (Number.isNaN(index)) {
                return;
            }

            state.currentImage = index;
            updateCarousel(root);
        });

        root.__aboutBound = true;
    }

    updateCarousel(root);
}

export default function About(root, data = {}) {
    const siteSlug = resolveSiteSlug(data);
    const fallbackMembers = getFallbackMembers();
    const fallbackGroupInfo = getDefaultGroupInfo(siteSlug);

    (async () => {
        let groupInfo = fallbackGroupInfo;
        let membersData = [];

        try {
            const res = await api.get(`/generate/generated-websites/type/${encodeURIComponent(siteSlug)}`);
            const payload = res?.data?.data || {};

            membersData = Array.isArray(payload?.members)
                ? payload.members.map((member) => ({
                    name: member?.name || member?.stage_name || '',
                    fullName: member?.fullname || member?.full_name || member?.name || '',
                    birthdate: member?.birthdate || '',
                    photo: member?.image_profile || member?.photo || '',
                })).filter((member) => member.name || member.fullName || member.photo)
                : [];

            groupInfo = {
                title: payload?.community_name ? `About ${payload.community_name}` : fallbackGroupInfo.title,
                description: payload?.description || payload?.about || fallbackGroupInfo.description,
                photo: payload?.image_cover || payload?.cover_photo || payload?.image_profile || fallbackGroupInfo.photo,
            };
        } catch (_) {
            membersData = [];
        }

        if (!membersData.length) {
            membersData = fallbackMembers;
        }

        renderAbout(root, groupInfo, membersData);
    })();
}

function updateCarousel(root) {
    const state = root.__aboutState;
    const section = root.querySelector('.about-section');
    if (!state || !section) {
        return;
    }

    const { currentImage, totalImages, allItems, membersData } = state;
    const indicator = section.querySelector('.pagination-indicator');
    const images = section.querySelectorAll('.carousel-image');
    const groupInfoDiv = section.querySelector('#groupInfo');
    const memberInfoDiv = section.querySelector('#memberInfo');
    const nameDisplay = section.querySelector('#memberNameDisplay');
    const fullNameDisplay = section.querySelector('#memberFullName');
    const birthdateDisplay = section.querySelector('#memberBirthdate');
    const memberNames = section.querySelectorAll('.member-name');

    if (indicator) {
        indicator.textContent = `${currentImage} / ${totalImages}`;
    }

    const mainIndex = (currentImage - 1) % allItems.length;
    const back1Index = (mainIndex + 1) % allItems.length;
    const back2Index = (mainIndex + 2) % allItems.length;

    if (images[0]) {
        images[0].src = allItems[back2Index]?.photo || '';
        images[0].alt = `${allItems[back2Index]?.name || 'Group'} photo`;
    }
    if (images[1]) {
        images[1].src = allItems[back1Index]?.photo || '';
        images[1].alt = `${allItems[back1Index]?.name || 'Group'} photo`;
    }
    if (images[2]) {
        images[2].src = allItems[mainIndex]?.photo || '';
        images[2].alt = `${allItems[mainIndex]?.name || 'Group'} photo`;
    }

    if (currentImage === 1) {
        if (groupInfoDiv) groupInfoDiv.style.display = 'block';
        if (memberInfoDiv) memberInfoDiv.style.display = 'none';
    } else {
        if (groupInfoDiv) groupInfoDiv.style.display = 'none';
        if (memberInfoDiv) memberInfoDiv.style.display = 'block';

        const currentMember = membersData[currentImage - 2];
        if (currentMember) {
            if (nameDisplay) nameDisplay.textContent = currentMember.name;
            if (fullNameDisplay) fullNameDisplay.textContent = currentMember.fullName;
            if (birthdateDisplay) birthdateDisplay.textContent = currentMember.birthdate;
        }
    }

    memberNames.forEach((name) => {
        const index = Number(name.getAttribute('data-index'));
        name.classList.toggle('active', index === currentImage);
    });
}
