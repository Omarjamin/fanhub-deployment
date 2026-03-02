import { config } from 'dotenv';

config();

const rawCloudinaryUrl = String(process.env.CLOUDINARY_URL || '').trim();
if (rawCloudinaryUrl) {
  try {
    // Validate early so malformed URL won't crash the cloudinary import path.
    new URL(rawCloudinaryUrl);
  } catch {
    console.warn('[cloudinary] Invalid CLOUDINARY_URL detected. Ignoring URL-based config.');
    delete process.env.CLOUDINARY_URL;
  }
}

const { v2: cloudinary } = await import('cloudinary');

const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
} else if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else {
  console.warn('[cloudinary] Cloudinary is not configured.');
}

export default cloudinary;
