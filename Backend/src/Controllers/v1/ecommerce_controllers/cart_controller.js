import express from "express";
import CartModel from "../../../Models/ecommerce_model/cart_model.js";
console.log("Controller reached");

class CartController {
    resolveSiteSlug(req, res) {
        const raw =
            req.headers['x-site-slug'] ||
            req.headers['x-community-type'] ||
            req.body?.site_slug ||
            req.body?.community_type ||
            req.query?.site_slug ||
            req.query?.community_type ||
            res.locals?.siteSlug ||
            res.locals?.communityType ||
            '';
        return String(raw).trim().toLowerCase();
    }

    /** GET cart items for a user in a community */
    async getCart(req, res) {
        try {
            const userId = req.body.userId || req.query.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            const items = await CartModel.getCartItems(userId, siteSlug);
            res.json({ success: true, data: items });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    /** POST add item (by variant) */
   

    async addItem(req, res) {
        try {
            console.log("res.locals:", res.locals.userId);
            console.log("req.body:", req.body);
            const userId = req.body.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            let {variantId, quantity } = req.body;

            // Validate required parameters
            if (!userId) {
                return res.status(400).json({ success: false, message: "User ID is required" });
            }
            if (!variantId) {
                return res.status(400).json({ success: false, message: "Variant ID is required" });
            }
        

         

            if (quantity <= 0) {
                throw new Error("Quantity must be greater than zero");
            }

            const result = await CartModel.addItem(userId, variantId, quantity, siteSlug);
            res.json({ success: true, message: result.message });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    /** PUT update item quantity (by variant) */
    async updateItem(req, res) {
        try {
            const userId = req.body.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            let {variantId, quantity } = req.body;

            // Validate required parameters
            if (!userId) {
                return res.status(400).json({ success: false, message: "User ID is required" });
            }
            if (!variantId) {
                return res.status(400).json({ success: false, message: "Variant ID is required" });
            }
         
            if (!quantity || quantity <= 0) {
                return res.status(400).json({ success: false, message: "Quantity must be greater than zero" });
            }

    

            const result = await CartModel.updateItem(userId, variantId, quantity, siteSlug);
            res.json({ success: true, message: result.message });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    /** DELETE remove item (by variant) */
    async removeItem(req, res) {
        try {
            const userId = req.body.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            let {variantId } = req.body;

            // Validate required parameters
            if (!userId) {
                return res.status(400).json({ success: false, message: "User ID is required" });
            }
            if (!variantId) {
                return res.status(400).json({ success: false, message: "Variant ID is required" });
            }
          
          

            const result = await CartModel.removeItem(userId, variantId, siteSlug);
            res.json({ success: true, message: result.message });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

  }

export default new CartController();
