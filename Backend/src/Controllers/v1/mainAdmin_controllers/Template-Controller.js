import TemplateModel from '../Models/Template-Model.js';
import cloudinary from '../core/cloudinary.js';

class TemplateController {
  constructor() {
    this.templateModel = new TemplateModel();
  }

  // GENERATE template
  async generateTemplate(req, res) {
    try {
      const data = { ...req.body };

      const imageFields = ['hero_section', 'members_img', 'music_img', 'event_img', 'announcement_img'];
      for (const field of imageFields) {
        if (req.files?.[field]) {
          const file = req.files[field][0];
          const uploaded = await cloudinary.uploader.upload(file.path, { folder: 'templates' });
          data[field] = uploaded.secure_url;
        }
      }

      const templateId = await this.templateModel.createTemplate(data);
      return res.status(201).json({ message: 'Template created successfully', templateId });
    } catch (err) {
      console.error('Error creating template', err);
      return res.status(500).json({ error: 'Failed to create template' });
    }
  }

  // GET all templates
  async getAllTemplates(req, res) {
    try {
      const templates = await this.templateModel.getAllTemplates();
      return res.status(200).json({ templates });
    } catch (err) {
      console.error('Error fetching templates', err);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  // GET single template
  async getTemplate(req, res) {
    const id = req.params.id;
    try {
      const template = await this.templateModel.getTemplateById(id);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      return res.status(200).json({ template });
    } catch (err) {
      console.error('Error fetching template', err);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }
  }

  // DELETE template
  async deleteTemplate(req, res) {
    const id = req.params.id;
    try {
      const deleted = await this.templateModel.deleteTemplate(id);
      if (!deleted) return res.status(400).json({ error: 'Failed to delete template' });
      return res.status(200).json({ message: 'Template deleted successfully' });
    } catch (err) {
      console.error('Error deleting template', err);
      return res.status(500).json({ error: 'Failed to delete template' });
    }
  }
}

export default TemplateController;
