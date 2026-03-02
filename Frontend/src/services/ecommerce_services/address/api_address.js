class Address_Api {
  constructor() {
    this.base = 'https://psgc.cloud/api/v2';
    this.NCR = 'National Capital Region (NCR)'; // Use name for clarity
  }

  // Get all regions
  async getRegions() {
    return fetch(`${this.base}/regions`).then(r => r.json()).then(data => data.data);
  }
      
  // Get provinces by region
  async getProvinces(regionName) {
    return fetch(`${this.base}/regions/${encodeURIComponent(regionName)}/provinces`)
      .then(r => r.json()).then(data => data.data);
  }

  // Get cities/municipalities by region or province
  async getCities(regionName, provinceName = null) {
    if (!provinceName) {
      // For NCR or region-level cities
      return fetch(`${this.base}/regions/${encodeURIComponent(regionName)}/cities-municipalities`)
        .then(r => r.json()).then(data => data.data);
    }
    // Nested: Province -> Cities/Municipalities
    return fetch(`${this.base}/regions/${encodeURIComponent(regionName)}/provinces/${encodeURIComponent(provinceName)}/cities-municipalities`)
      .then(r => r.json()).then(data => data.data);
  }



 

  // Get barangays by city/municipality
  async getBarangays(regionName, provinceName, cityName) {
    alert(regionName);
    if (regionName === this.NCR) {
      // For NCR, skip province level
      return fetch(`${this.base}/cities-municipalities/${encodeURIComponent(cityName)}/barangays`)
        .then(r => r.json()).then(data => data.data);
    }
    return fetch(`${this.base}/regions/${encodeURIComponent(regionName)}/provinces/${encodeURIComponent(provinceName)}/cities-municipalities/${encodeURIComponent(cityName)}/barangays`)
      .then(r => r.json()).then(data => data.data);
  }

  // Get ZIP code for a city/municipality
  async getZipCode(cityName) {
    return fetch(`${this.base}/cities-municipalities/${encodeURIComponent(cityName)}`)
      .then(r => r.json())
      .then(data => data.zip_code || '');
  }
}

export default Address_Api;
