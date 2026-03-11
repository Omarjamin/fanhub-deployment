class Address_Api {
  constructor() {
    this.base = 'https://psgc.cloud/api/v2';
    this.lookupBase = 'https://psgc.cloud/api';
    this.lookupV1Base = 'https://psgc.cloud/api/v1';
    this.NCR = 'National Capital Region (NCR)'; // Use name for clarity
    this.zipLookupPromise = null;
  }

  async fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Address API request failed: ${response.status}`);
    }
    return response.json();
  }

  extractRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  }

  async fetchRows(url) {
    return this.extractRows(await this.fetchJson(url));
  }

  normalizeName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ');
  }

  normalizeType(value) {
    const type = String(value || '').trim().toLowerCase();
    if (type.includes('city')) return 'city';
    if (type.includes('municipality')) return 'municipality';
    return '';
  }

  // Get all regions
  async getRegions() {
    return this.fetchRows(`${this.base}/regions`);
  }
      
  // Get provinces by region
  async getProvinces(regionName) {
    return this.fetchRows(`${this.base}/regions/${encodeURIComponent(regionName)}/provinces`);
  }

  // Get cities/municipalities by region or province
  async getCities(regionName, provinceName = null) {
    if (!provinceName) {
      // For NCR or region-level cities
      return this.fetchRows(`${this.base}/regions/${encodeURIComponent(regionName)}/cities-municipalities`);
    }
    // Nested: Province -> Cities/Municipalities
    return this.fetchRows(`${this.base}/regions/${encodeURIComponent(regionName)}/provinces/${encodeURIComponent(provinceName)}/cities-municipalities`);
  }

  // Get barangays by city/municipality
  async getBarangays(regionName, provinceName, cityName) {
    if (regionName === this.NCR) {
      // For NCR, skip province level
      return this.fetchRows(`${this.base}/cities-municipalities/${encodeURIComponent(cityName)}/barangays`);
    }
    return this.fetchRows(`${this.base}/regions/${encodeURIComponent(regionName)}/provinces/${encodeURIComponent(provinceName)}/cities-municipalities/${encodeURIComponent(cityName)}/barangays`);
  }

  async getZipLookupRows() {
    if (!this.zipLookupPromise) {
      this.zipLookupPromise = Promise.all([
        this.fetchRows(`${this.lookupBase}/cities`).catch(() => []),
        this.fetchRows(`${this.lookupBase}/municipalities`).catch(() => []),
      ]).then(([cities, municipalities]) => [...cities, ...municipalities]);
    }

    return this.zipLookupPromise;
  }

  async searchZipByContext(locality) {
    const normalizedName = this.normalizeName(locality?.name);
    if (!normalizedName) return '';

    const params = new URLSearchParams({
      q: String(locality.name || '').trim(),
      per_page: '100',
    });

    if (locality?.provinceCode) params.set('province_code', String(locality.provinceCode).trim());
    if (locality?.regionCode) params.set('region_code', String(locality.regionCode).trim());

    const normalizedType = this.normalizeType(locality?.type);
    if (normalizedType) params.set('type', normalizedType);

    const rows = await this.fetchRows(`${this.lookupV1Base}/cities-municipalities?${params.toString()}`);
    const match = rows.find(row => this.normalizeName(row?.name) === normalizedName);
    return String(match?.zip_code || match?.zipCode || '').trim();
  }

  // Get ZIP code for a city/municipality from PSGC Cloud list endpoints.
  async getZipCode(locality) {
    const localityName = typeof locality === 'string'
      ? locality
      : String(locality?.name || locality?.cityName || '');
    const localityCode = typeof locality === 'object'
      ? String(locality?.code || locality?.id || '')
      : '';
    const localityType = typeof locality === 'object'
      ? String(locality?.type || '')
      : '';
    const regionCode = typeof locality === 'object'
      ? String(locality?.regionCode || '')
      : '';
    const provinceCode = typeof locality === 'object'
      ? String(locality?.provinceCode || '')
      : '';

    const normalizedName = this.normalizeName(localityName);
    if (!normalizedName && !localityCode) return '';

    const rows = await this.getZipLookupRows();
    const match = rows.find(row => {
      const rowCode = String(row?.code || row?.id || '').trim();
      const rowName = this.normalizeName(row?.name || row?.cityName || row?.municipalityName);

      if (localityCode && rowCode && rowCode === localityCode) return true;
      return false;
    });

    if (match?.zip_code || match?.zipCode) {
      return String(match?.zip_code || match?.zipCode || '').trim();
    }

    const contextualZip = await this.searchZipByContext({
      name: localityName,
      type: localityType,
      regionCode,
      provinceCode,
    }).catch(() => '');
    if (contextualZip) return contextualZip;

    const fallbackMatch = rows.find(row => {
      const rowName = this.normalizeName(row?.name || row?.cityName || row?.municipalityName);
      return normalizedName ? rowName === normalizedName : false;
    });

    return String(fallbackMatch?.zip_code || fallbackMatch?.zipCode || '').trim();
  }
}

export default Address_Api;
