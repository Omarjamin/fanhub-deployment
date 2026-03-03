import express from "express";
import CartModel from "../../../Models/ecommerce_model/cart_model.js";
import { resolveSiteSlug } from "../../../utils/site-scope.js";
console.log("Controller reached");

class CartController {
    resolveSiteSlug(req, res) {
        return resolveSiteSlug(req, res);
    }

    /** GET cart items for a user in a community */
    async getCart(req, res) {
        try {
            const userId = req.body.userId || req.query.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            if (!siteSlug) {
                return res.status(400).json({ success: false, message: "site/community scope is required" });
            }
            const items = await CartModel.getCartItems(userId, siteSlug);
            res.json({ success: true, data: items });
        } catch (err) {
            if (err?.code === "SITE_SCOPE_NOT_FOUND") {
                return res.status(404).json({ success: false, message: err.message });
            }
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
            if (!siteSlug) {
                return res.status(400).json({ success: false, message: "site/community scope is required" });
            }
            const variantId = Number(req.body.variantId);
            const quantity = Number(req.body.quantity);

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
            if (err?.code === "SITE_SCOPE_NOT_FOUND") {
                return res.status(404).json({ success: false, message: err.message });
            }
            res.status(400).json({ success: false, message: err.message });
        }
    }

    /** PUT update item quantity (by variant) */
    async updateItem(req, res) {
        try {
            const userId = req.body.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            if (!siteSlug) {
                return res.status(400).json({ success: false, message: "site/community scope is required" });
            }
            const variantId = Number(req.body.variantId);
            const quantity = Number(req.body.quantity);

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
            if (err?.code === "SITE_SCOPE_NOT_FOUND") {
                return res.status(404).json({ success: false, message: err.message });
            }
            res.status(400).json({ success: false, message: err.message });
        }
    }

    /** DELETE remove item (by variant) */
    async removeItem(req, res) {
        try {
            const userId = req.body.userId || res.locals.userId;
            const siteSlug = this.resolveSiteSlug(req, res);
            if (!siteSlug) {
                return res.status(400).json({ success: false, message: "site/community scope is required" });
            }
            const variantId = Number(req.body.variantId || req.query.variantId);

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
            if (err?.code === "SITE_SCOPE_NOT_FOUND") {
                return res.status(404).json({ success: false, message: err.message });
            }
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

export default new CartController();
