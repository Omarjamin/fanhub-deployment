import { Router } from 'express';
import cloudinary from '../../cloudinaryConfig.js'; 

const cloudinaryRouter = Router();

cloudinaryRouter.post('/upload', async (req, res) => {
  try {
    // Accept common field names and fallback to the first uploaded file
    const uploadedFile =
      req.files?.file ||
      req.files?.image_file ||
      req.files?.image ||
      (req.files ? Object.values(req.files)[0] : null);

    if (!uploadedFile) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const file = uploadedFile.tempFilePath || uploadedFile.path;
    if (!file) {
      return res.status(400).json({ message: 'Invalid file upload payload' });
    }

    const result = await cloudinary.uploader.upload(file, { folder: 'uploads' });
    res.status(200).json({
      message: 'Image uploaded successfully',
      url: result.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
    
  }
});

export default cloudinaryRouter;
