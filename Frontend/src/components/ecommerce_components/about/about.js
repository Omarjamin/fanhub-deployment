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
        title: `About ${label}`,
        description: `Welcome to the ${label} community page.

This section highlights the group and its members. Member details and images are loaded based on the active community type so each generated site shows its own content.`,
        photo: 'https://res.cloudinary.com/dy5u1ccgi/image/upload/v1772978023/bnipics_wn5e6f.jpg',
    };
}

function getFallbackMembers() {
    return [
        { name: 'AAIAH', primaryLabel: 'Full Name', primaryValue: 'Maraiah Queen Arceta', secondaryLabel: 'Date of Birth', secondaryValue: 'January 27, 2001', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010180_m4oshc.jpg' },
        { name: 'COLET', primaryLabel: 'Full Name', primaryValue: 'Ma. Nicolette Vergara', secondaryLabel: 'Date of Birth', secondaryValue: 'September 14, 2001', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759408350/1000010181_km87z1.jpg' },
        { name: 'GWEN', primaryLabel: 'Full Name', primaryValue: 'Gweneth L. Apuli', secondaryLabel: 'Date of Birth', secondaryValue: 'June 19, 2003', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010183_wlbruk.jpg' },
        { name: 'MALOI', primaryLabel: 'Full Name', primaryValue: 'Mary Loi Yves Ricalde', secondaryLabel: 'Date of Birth', secondaryValue: 'May 27, 2002', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010182_fv8nxb.jpg' },
        { name: 'JHOANNA', primaryLabel: 'Full Name', primaryValue: 'Jhoanna Christine Robles', secondaryLabel: 'Date of Birth', secondaryValue: 'January 26, 2004', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407990/1000010186_ppfcpb.jpg' },
        { name: 'MIKHA', primaryLabel: 'Full Name', primaryValue: 'Mikhaela Janna Lim', secondaryLabel: 'Date of Birth', secondaryValue: 'November 8, 2003', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407989/1000010185_cdbpgv.jpg' },
        { name: 'SHEENA', primaryLabel: 'Full Name', primaryValue: 'Sheena Mae Catacutan', secondaryLabel: 'Date of Birth', secondaryValue: 'May 9, 2004', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407988/1000010187_er3rop.jpg' },
        { name: 'STACEY', primaryLabel: 'Full Name', primaryValue: 'Stacey Aubrey', secondaryLabel: 'Date of Birth', secondaryValue: 'July 13, 2003', photo: 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407989/1000010184_fnzqes.jpg' },
    ];
}

function normalizeMember(member = {}) {
    const primaryValue = String(
        member?.fullname ||
        member?.full_name ||
        member?.fullName ||
        member?.role ||
        member?.name ||
        ''
    ).trim();
    const secondaryValue = String(
        member?.birthdate ||
        member?.description ||
        ''
    ).trim();

    return {
        name: String(member?.name || member?.stage_name || '').trim(),
        primaryLabel: member?.role ? 'Role' : 'Full Name',
        primaryValue,
        secondaryLabel: member?.description ? 'Description' : 'Date of Birth',
        secondaryValue,
        photo: String(member?.image_profile || member?.photo || member?.image || '').trim(),
    };
}

function buildGroupInfo(payload = {}, fallbackGroupInfo) {
    const siteName = String(
        payload?.site_name ||
        payload?.community_name ||
        payload?.name ||
        ''
    ).trim();
    const shortBio = String(payload?.short_bio || payload?.shortBio || '').trim();
    const description = String(payload?.description || payload?.about || '').trim();
    const photo = String(
        payload?.group_photo ||
        payload?.banner ||
        payload?.image_cover ||
        payload?.cover_photo ||
        payload?.logo ||
        payload?.image_profile ||
        fallbackGroupInfo.photo
    ).trim();

    return {
        title: siteName ? `About ${siteName}` : fallbackGroupInfo.title,
        description: description || shortBio || fallbackGroupInfo.description,
        photo: photo || fallbackGroupInfo.photo,
    };
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
                                    <span class="detail-label" id="memberPrimaryLabel">${membersData[0]?.primaryLabel || 'Full Name'}</span>
                                    <span class="detail-value" id="memberPrimaryValue">${membersData[0]?.primaryValue || ''}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label" id="memberSecondaryLabel">${membersData[0]?.secondaryLabel || 'Date of Birth'}</span>
                                    <span class="detail-value" id="memberSecondaryValue">${membersData[0]?.secondaryValue || ''}</span>
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
    const fallbackGroupInfo = getDefaultGroupInfo(siteSlug);

    (async () => {
        let groupInfo = fallbackGroupInfo;
        let membersData = [];

        try {
            const res = await api.get(`/generate/generated-websites/type/${encodeURIComponent(siteSlug)}`);
            const payload = res?.data?.data || {};

            membersData = Array.isArray(payload?.members)
                ? payload.members
                    .map((member) => normalizeMember(member))
                    .filter((member) => member.name || member.primaryValue || member.secondaryValue || member.photo)
                : [];

            groupInfo = buildGroupInfo(payload, fallbackGroupInfo);
        } catch (_) {
            membersData = [];
        }

        if (!membersData.length) {
            membersData = getFallbackMembers();
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
    const primaryLabelDisplay = section.querySelector('#memberPrimaryLabel');
    const primaryValueDisplay = section.querySelector('#memberPrimaryValue');
    const secondaryLabelDisplay = section.querySelector('#memberSecondaryLabel');
    const secondaryValueDisplay = section.querySelector('#memberSecondaryValue');
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
            if (primaryLabelDisplay) primaryLabelDisplay.textContent = currentMember.primaryLabel || 'Full Name';
            if (primaryValueDisplay) primaryValueDisplay.textContent = currentMember.primaryValue || '';
            if (secondaryLabelDisplay) secondaryLabelDisplay.textContent = currentMember.secondaryLabel || 'Date of Birth';
            if (secondaryValueDisplay) secondaryValueDisplay.textContent = currentMember.secondaryValue || '';
        }
    }

    memberNames.forEach((name) => {
        const index = Number(name.getAttribute('data-index'));
        name.classList.toggle('active', index === currentImage);
    });
}
