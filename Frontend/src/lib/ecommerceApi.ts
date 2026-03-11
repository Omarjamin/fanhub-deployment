import AddressApi from "@/services/ecommerce_services/address/api_address.js";
import { api as ecommerceApi } from "@/services/ecommerce_services/api.js";
import { authHeaders, getAuthToken } from "@/services/ecommerce_services/auth/auth.js";
import { addToCart, getCart, removeFromCart, updateCartItem } from "@/components/ecommerce_components/cart/cart.js";
import { fetchProductDetails } from "@/services/ecommerce_services/shop/product_details.js";
import { getModernSiteData, getModernSiteSlug } from "@/lib/modern-react/context";
import { api as apiUrl } from "@/services/ecommerce_services/config.js";

type GenericRecord = Record<string, any>;

const DEFAULT_API_V1 = "https://fanhub-deployment-production.up.railway.app/v1";

function resolveApiV1() {
  return String(import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim().replace(/\/$/, "");
}

function normalizeSlug() {
  return String(getModernSiteSlug() || "").trim().toLowerCase();
}

function getSiteData() {
  return getModernSiteData();
}

function asRecord(value: unknown): GenericRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;
}

function parseJsonIfNeeded<T = unknown>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function pickArray(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    const parsed = parseJsonIfNeeded(candidate);
    if (Array.isArray(parsed)) return parsed;
  }
  return [];
}

function getNormalizedSitePayload(site: unknown) {
  const root = asRecord(site) || {};
  const data = asRecord(root.data) || {};
  const payload = asRecord(root.payload) || {};
  const siteData = asRecord(root.siteData) || {};
  const siteNode = asRecord(root.site) || {};

  return {
    ...data,
    ...payload,
    ...siteData,
    ...siteNode,
    ...root,
    members: pickArray(
      root.members,
      root.site_members,
      root.membersData,
      data.members,
      data.site_members,
      payload.members,
      payload.site_members,
      siteData.members,
      siteData.site_members,
      siteNode.members,
      siteNode.site_members,
    ),
    discography: pickArray(
      root.discography,
      root.music,
      data.discography,
      data.music,
      payload.discography,
      payload.music,
      siteData.discography,
      siteData.music,
    ),
    events: pickArray(
      root.events,
      root.event_posters,
      data.events,
      data.event_posters,
      payload.events,
      payload.event_posters,
      siteData.events,
      siteData.event_posters,
    ),
  };
}

function toAbsoluteMediaUrl(value: string, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = String(window.__API_ORIGIN__ || new URL(resolveApiV1()).origin).replace(/\/$/, "");
  return `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function formatDisplayDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

async function fetchGeneratedSiteData() {
  const slug = normalizeSlug();
  if (!slug) return null;

  const response = await fetch(
    `${resolveApiV1()}/generate/generated-websites/type/${encodeURIComponent(slug)}`,
    {
      headers: {
        apikey: String(import.meta.env.VITE_API_KEY || "thread"),
        "x-site-slug": slug,
        "x-community-type": slug,
        ...authHeaders(slug),
      },
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Failed to fetch site data (${response.status})`);
  }

  return payload?.data || null;
}

async function ensureSiteData() {
  const current = getSiteData();
  if (current) return getNormalizedSitePayload(current);
  return getNormalizedSitePayload(await fetchGeneratedSiteData());
}

function normalizeCollection(row: GenericRecord) {
  return {
    id: String(row.collection_id || row.id || row.collectionId || ""),
    name: String(row.name || row.collection_name || "Collection"),
    image: toAbsoluteMediaUrl(row.img_url || row.image || row.image_url || "", ""),
  };
}

function normalizeProduct(row: GenericRecord) {
  return {
    id: String(row.product_id || row.id || ""),
    name: String(row.name || "Product"),
    price: Number(row.price || 0),
    image: toAbsoluteMediaUrl(row.img_url || row.image_url || row.image || "", ""),
    description: String(row.description || ""),
    category: String(row.category_name || row.category || ""),
  };
}

export async function fetchSiteProfile() {
  const site = getNormalizedSitePayload(await ensureSiteData());
  return {
    siteName: String(site?.site_name || site?.community_name || site?.community_type || "Community"),
    shortBio: String(site?.short_bio || site?.description_short || site?.site_tagline || ""),
    description: String(
      site?.site_description ||
        site?.description ||
        site?.about_description ||
        site?.community_description ||
        "",
    ),
  };
}

export async function fetchSiteMembers() {
  const site = getNormalizedSitePayload(await ensureSiteData());
  const rows = pickArray(site?.members, site?.site_members);
  return rows.map((member: GenericRecord, index: number) => ({
    id: String(member.member_id || member.id || index + 1),
    name: String(member.name || "Member"),
    role: String(member.role || member.position || member.title || ""),
    description: String(
      member.description ||
        member.bio ||
        formatDisplayDate(member.birthdate) ||
        "",
    ),
    image: toAbsoluteMediaUrl(member.image_profile || member.image || member.photo || "", ""),
  }));
}

export async function fetchDiscographyAlbums() {
  const site = getNormalizedSitePayload(await ensureSiteData());
  const rows = pickArray(site?.discography, site?.music);
  return rows.map((album: GenericRecord, index: number) => ({
    id: String(album.id || album.album_id || index + 1),
    title: String(album.title || album.album_name || "Release"),
    year: String(album.release_year || album.year || ""),
    songs: Number(album.song_count || album.total_tracks || 0),
    cover: toAbsoluteMediaUrl(album.cover_image || album.image || album.album_cover || "", ""),
    link: String(album.spotify_link || album.apple_music_link || album.url || "#"),
  }));
}

export async function fetchEventPosters() {
  const site = getNormalizedSitePayload(await ensureSiteData());
  const rows = pickArray(site?.events, site?.event_posters);
  return rows.map((event: GenericRecord, index: number) => ({
    id: String(event.id || event.event_id || index + 1),
    name: String(event.title || event.event_name || "Event"),
    image: toAbsoluteMediaUrl(
      event.poster_url || event.poster || event.image || event.image_url || event.banner || "",
      "",
    ),
    ticketLink: String(event.ticket_link || event.link || "#"),
  }));
}

export async function fetchShopCollections() {
  const slug = normalizeSlug();
  const response = await ecommerceApi(`/shop/getCollections`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(slug),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Failed to load collections");
  }
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map(normalizeCollection);
}

export async function fetchAllProductsAcrossCollections(collectionIds: string[]) {
  const uniqueIds = Array.from(new Set((collectionIds || []).filter(Boolean)));
  const rows = await Promise.all(
    uniqueIds.map(async (collectionId) => {
      const response = await ecommerceApi(`/shop/getProductCollection/${encodeURIComponent(collectionId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(normalizeSlug()),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `Failed to load products for ${collectionId}`);
      }
      return Array.isArray(payload?.data) ? payload.data : [];
    }),
  );

  return rows.flat().map(normalizeProduct);
}

export async function fetchProductWithVariants(productId: string) {
  const data = await fetchProductDetails(productId, normalizeSlug());
  return {
    product: data?.product || null,
    variants: Array.isArray(data?.variants) ? data.variants : [],
  };
}

export function buildEcommerceLoginUrl(_siteSlug?: string, redirectPath = "/") {
  const slug = normalizeSlug();
  const base = slug ? `/fanhub/${slug}/signin` : "/signin";
  const rawRedirect = String(redirectPath || "/").trim() || "/";
  const redirect =
    slug && rawRedirect.startsWith("/") && !rawRedirect.startsWith(`/fanhub/${slug}`)
      ? `/fanhub/${slug}${rawRedirect === "/" ? "" : rawRedirect}`
      : rawRedirect;
  return redirect ? `${base}?redirect=${encodeURIComponent(redirect)}` : base;
}

export function isEcommerceLoggedIn() {
  return Boolean(getAuthToken(normalizeSlug()));
}

export async function addProductToCart(productId: string | number, quantity = 1) {
  const { variants } = await fetchProductWithVariants(String(productId));
  const variantId = Number(
    variants?.[0]?.product_variant_id || variants?.[0]?.variant_id || variants?.[0]?.id || 0,
  );
  if (!variantId) {
    throw new Error("No product variant available");
  }

  const result = await addToCart(variantId, quantity);
  if (!result?.success) {
    throw new Error(result?.message || "Failed to add product to cart");
  }

  return result;
}

export async function fetchCartItems() {
  const rows = await getCart();
  return (Array.isArray(rows) ? rows : []).map((item: GenericRecord) => ({
    itemId: Number(item.cart_item_id || item.item_id || item.id || 0),
    productId: Number(item.product_id || item.productId || 0),
    variantId: Number(item.variant_id || item.variantId || 0),
    name: String(item.product_name || item.name || "Item"),
    image: toAbsoluteMediaUrl(item.product_image || item.image || item.img_url || "", ""),
    category: String(item.category_name || item.category || ""),
    variant: String(item.variant_values || item.variant_name || item.variant || ""),
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    weight: Number(item.weight || item.weight_g || item.weight_in_grams || 0),
  }));
}

export async function removeCartItem(variantId: number) {
  const result = await removeFromCart(variantId);
  if (!result?.success) {
    throw new Error(result?.message || "Failed to remove cart item");
  }
  return result;
}

export async function updateCartItemQuantity(variantId: number, quantity: number) {
  const result = await updateCartItem(variantId, quantity);
  if (!result?.success) {
    throw new Error(result?.message || "Failed to update cart item");
  }
  return result;
}

const addressApi = new AddressApi();

export async function fetchAddressRegions() {
  const rows = await addressApi.getRegions();
  return Array.isArray(rows) ? rows.map((row: GenericRecord) => ({
    code: String(row.code || row.id || row.name || ""),
    name: String(row.name || row.regionName || ""),
  })) : [];
}

export async function fetchAddressProvinces(regionName: string) {
  const rows = await addressApi.getProvinces(regionName);
  return Array.isArray(rows) ? rows.map((row: GenericRecord) => ({
    code: String(row.code || row.id || row.name || ""),
    name: String(row.name || row.provinceName || ""),
  })) : [];
}

export async function fetchAddressCities(regionName: string, provinceName: string | null) {
  const rows = await addressApi.getCities(regionName, provinceName || null);
  return Array.isArray(rows) ? rows.map((row: GenericRecord) => ({
    code: String(row.code || row.id || row.name || ""),
    name: String(row.name || row.cityName || ""),
  })) : [];
}

export async function fetchAddressBarangays(regionName: string, provinceName: string, cityName: string) {
  const rows = await addressApi.getBarangays(regionName, provinceName, cityName);
  return Array.isArray(rows) ? rows.map((row: GenericRecord) => ({
    code: String(row.code || row.id || row.name || ""),
    name: String(row.name || row.barangayName || ""),
  })) : [];
}

export async function fetchCityZipCode(cityName: string) {
  return String((await addressApi.getZipCode(cityName)) || "");
}

export async function createOrder(payload: GenericRecord) {
  const response = await ecommerceApi("/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(normalizeSlug()),
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || "Failed to create order");
  }

  return result?.data || result;
}

export async function fetchOrderHistory() {
  const response = await fetch(apiUrl("/orders/user"), {
    method: "GET",
    headers: authHeaders(normalizeSlug()),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || "Failed to load order history");
  }
  return result?.orders || result?.data || result || [];
}

export function toExternalUrl(value: string, fallback = "") {
  return toAbsoluteMediaUrl(value, fallback);
}
