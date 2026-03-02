import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';


dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEYS,
  api_secret: process.env.API_SECRET_KEYS,
});

export default cloudinary;
