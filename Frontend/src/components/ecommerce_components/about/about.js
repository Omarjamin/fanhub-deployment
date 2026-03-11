import api from '../../../lib/api.js';
import { getActiveSiteSlug } from '../../../lib/site-context.js';

function getPayloadSource(data = {}) {
    if (data?.siteData && typeof data.siteData === 'object') {
        return data.siteData;
    }

    return data && typeof data === 'object' ? data : {};
}

function resolveSiteSlug(data = {}) {
    const payload = getPayloadSource(data);
    const fromData = String(
        data?.siteSlug ||
        payload?.site_slug ||
        payload?.domain ||
        payload?.community_type ||
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

    return getActiveSiteSlug() || '';
}

function getDefaultGroupInfo(siteSlug = '') {
    const normalizedSlug = String(siteSlug || '').trim();
    const label = normalizedSlug ? normalizedSlug.toUpperCase() : 'COMMUNITY';

    return {
        title: `About ${label}`,
        description: `Welcome to the ${label} community page.

This section highlights the group and its members. Member details and images are loaded based on the active community type so each generated site shows its own content.`,
        photo: '',
    };
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

function getCachedSitePayload(siteSlug = '') {
    const candidates = [
        `site_data:${siteSlug}`,
        'active_site_data',
    ];

    for (const key of candidates) {
        try {
            const raw = sessionStorage.getItem(key) || localStorage.getItem(key) || '';
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch (_) {}
    }

    return null;
}

function normalizeMembersFromPayload(payload = {}) {
    return Array.isArray(payload?.members)
        ? payload.members
            .map((member) => normalizeMember(member))
            .filter((member) => member.name || member.primaryValue || member.secondaryValue || member.photo)
        : [];
}

function renderAbout(root, groupInfo, membersData) {
    root.querySelectorAll('#about').forEach((node) => node.remove());

    const allItems = [groupInfo, ...membersData];
    const totalImages = allItems.length;
    const memberHeaderLabel = String(groupInfo.title || '')
        .replace(/^About\s+/i, '')
        .trim()
        .toUpperCase() || 'MEMBER';

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
                                <span class="bini-label">${memberHeaderLabel}</span>
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
                        ${membersData.length === 0 ? '<p class="about-description">No members available for this community yet.</p>' : ''}
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
        let payload = getPayloadSource(data);
        const cachedPayload = getCachedSitePayload(siteSlug);
        if ((!Array.isArray(payload?.members) || !payload.members.length) && cachedPayload) {
            payload = cachedPayload;
        }
        let groupInfo = buildGroupInfo(payload, fallbackGroupInfo);
        let membersData = normalizeMembersFromPayload(payload);

        const hasUsefulGroupInfo =
            Boolean(String(payload?.site_name || payload?.community_name || payload?.name || '').trim()) ||
            Boolean(String(payload?.description || payload?.about || payload?.short_bio || payload?.shortBio || '').trim()) ||
            Boolean(String(payload?.group_photo || payload?.banner || payload?.logo || '').trim());

        if ((!membersData.length || !hasUsefulGroupInfo) && siteSlug) {
            const slugVariants = Array.from(new Set([
                siteSlug,
                siteSlug.replace(/-website$/i, ''),
                siteSlug.endsWith('-website') ? siteSlug : `${siteSlug}-website`,
            ].filter(Boolean)));

            for (const candidate of slugVariants) {
                try {
                    const res = await api.get(`/generate/generated-websites/type/${encodeURIComponent(candidate)}`);
                    payload = res?.data?.data || {};

                    const fetchedMembers = normalizeMembersFromPayload(payload);

                    groupInfo = buildGroupInfo(payload, fallbackGroupInfo);

                    if (fetchedMembers.length || String(payload?.site_name || payload?.description || payload?.short_bio || '').trim()) {
                        membersData = fetchedMembers;
                        break;
                    }
                } catch (_) {}
            }
        }

        if (!membersData.length && siteSlug) {
            const slugVariants = new Set([
                siteSlug,
                siteSlug.replace(/-website$/i, ''),
                siteSlug.endsWith('-website') ? siteSlug : `${siteSlug}-website`,
            ].filter(Boolean));

            try {
                const res = await api.get('/generate/generated-websites');
                const rows = Array.isArray(res?.data?.data)
                    ? res.data.data
                    : Array.isArray(res?.data?.websites)
                        ? res.data.websites
                        : [];

                const matched = rows.find((row) => {
                    const domain = String(row?.domain || '').trim().toLowerCase();
                    const communityType = String(row?.community_type || '').trim().toLowerCase();
                    const siteName = String(row?.site_name || '').trim().toLowerCase();
                    return slugVariants.has(domain) || slugVariants.has(communityType) || slugVariants.has(siteName);
                });

                if (matched) {
                    const fetchedMembers = normalizeMembersFromPayload(matched);
                    if (fetchedMembers.length) {
                        membersData = fetchedMembers;
                    }
                    groupInfo = buildGroupInfo(matched, fallbackGroupInfo);
                }
            } catch (_) {}
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
