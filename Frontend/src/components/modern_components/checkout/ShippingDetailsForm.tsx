type AddressOption = {
  code: string;
  name: string;
};

type ShippingDetailsFormProps = {
  streetAddress: string;
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
  zipCode: string;
  regions: AddressOption[];
  provinces: AddressOption[];
  cities: AddressOption[];
  barangays: AddressOption[];
  loadingRegions?: boolean;
  loadingProvinces?: boolean;
  loadingCities?: boolean;
  loadingBarangays?: boolean;
  isNcrRegion?: boolean;
  onStreetAddressChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onCityMunicipalityChange: (value: string) => void;
  onBarangayChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
};

const ShippingDetailsForm = ({
  streetAddress,
  region,
  province,
  cityMunicipality,
  barangay,
  zipCode,
  regions,
  provinces,
  cities,
  barangays,
  loadingRegions,
  loadingProvinces,
  loadingCities,
  loadingBarangays,
  isNcrRegion,
  onStreetAddressChange,
  onRegionChange,
  onProvinceChange,
  onCityMunicipalityChange,
  onBarangayChange,
  onZipCodeChange,
}: ShippingDetailsFormProps) => {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5 text-black">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-body font-semibold text-black">Shipping Details</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <select
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          className="h-11 rounded-xl border border-border/60 bg-background px-3 font-body text-sm outline-none focus:border-primary/60"
        >
          <option value="">{loadingRegions ? "Loading regions..." : "Select Region"}</option>
          {regions.map((item) => (
            <option key={item.code || item.name} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={province}
          onChange={(e) => onProvinceChange(e.target.value)}
          disabled={!region || !!isNcrRegion}
          className="h-11 rounded-xl border border-border/60 bg-background px-3 font-body text-sm outline-none focus:border-primary/60 disabled:opacity-60"
        >
          <option value="">
            {isNcrRegion
              ? "No province needed for NCR"
              : loadingProvinces
                ? "Loading provinces..."
                : "Select Province"}
          </option>
          {!isNcrRegion
            ? provinces.map((item) => (
                <option key={item.code || item.name} value={item.name}>
                  {item.name}
                </option>
              ))
            : null}
        </select>

        <select
          value={cityMunicipality}
          onChange={(e) => onCityMunicipalityChange(e.target.value)}
          disabled={!region || (!isNcrRegion && !province)}
          className="h-11 rounded-xl border border-border/60 bg-background px-3 font-body text-sm outline-none focus:border-primary/60 disabled:opacity-60"
        >
          <option value="">{loadingCities ? "Loading cities..." : "Select City / Municipality"}</option>
          {cities.map((item) => (
            <option key={item.code || item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={barangay}
          onChange={(e) => onBarangayChange(e.target.value)}
          disabled={!cityMunicipality}
          className="h-11 rounded-xl border border-border/60 bg-background px-3 font-body text-sm outline-none focus:border-primary/60 disabled:opacity-60"
        >
          <option value="">{loadingBarangays ? "Loading barangays..." : "Select Barangay"}</option>
          {barangays.map((item) => (
            <option key={item.code || item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>

        <input
          value={zipCode}
          onChange={(e) => onZipCodeChange(e.target.value)}
          placeholder="Zip Code"
          readOnly
          aria-readonly="true"
          inputMode="numeric"
          className="h-11 rounded-xl border border-border/60 bg-background px-3 font-body text-sm outline-none focus:border-primary/60 md:col-span-2"
        />

        <textarea
          value={streetAddress}
          onChange={(e) => onStreetAddressChange(e.target.value)}
          placeholder="Street address"
          className="min-h-24 rounded-xl border border-border/60 bg-background px-3 py-2 font-body text-sm outline-none focus:border-primary/60 md:col-span-2"
        />
      </div>
    </div>
  );
};

export default ShippingDetailsForm;
