import { api } from '../api.js';
import { authHeaders } from '../auth/auth.js';

export async function loadAllCollections() {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...authHeaders(),
        };
        const response = await api(`/shop/getCollections`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch collections');
        }

        const result = await response.json();
        
        const collections = result.data;
        const collectionList = document.getElementById('collection-list');
        collectionList.innerHTML = '';  
        
        collections.forEach(collection => {
            const collectionItem = document.createElement('div');
            collectionItem.className = 'collection-item';   
            collectionItem.innerHTML = `
                <img src="${collection.img_url}" alt="${collection.name}" class="collection-image">
                <h3>${collection.name}</h3>
            `;
            collectionList.appendChild(collectionItem);
        });
    } catch (error) {
        console.error('Error loading collections:', error);
    }

}

export default loadAllCollections;

// show collection when shop is browse based kung ano ang community
// show product by default all collection besed kung ano un community 
// clickable colelction thaht can filter products
// view product
// add to cart
// checkout
// payment gateway integration
