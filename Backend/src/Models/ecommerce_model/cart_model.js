import { connect, resolveCommunityContext } from "../../core/database.js";

class CartModel {
    constructor() {
        this.db = null;
        this.activeCommunityId = null;
        this.columnCache = new Map();
        this.connect();
    }

    async connect() {
        this.db = await connect();
    }

    async ensureConnection(siteSlug = "") {
        this.db = await connect(siteSlug);
        const scoped = String(siteSlug || "").trim().toLowerCase();
        if (scoped) {
            const context = await resolveCommunityContext(scoped);
            if (!context?.community_id) {
                const scopeErr = new Error(`Site/community not found for "${scoped}"`);
                scopeErr.code = "SITE_SCOPE_NOT_FOUND";
                throw scopeErr;
            }
            this.activeCommunityId = Number(context.community_id) || null;
        } else {
            this.activeCommunityId = null;
        }
        return this.db;
    }

    async hasColumn(tableName, columnName) {
        const key = `${tableName}:${columnName}`.toLowerCase();
        if (this.columnCache.has(key)) return this.columnCache.get(key);
        try {
            const [rows] = await this.db.query(`SHOW COLUMNS FROM ${tableName}`);
            const exists = (rows || []).some(
                (row) => String(row?.Field || "").trim().toLowerCase() === String(columnName).trim().toLowerCase(),
            );
            this.columnCache.set(key, exists);
            return exists;
        } catch (_) {
            this.columnCache.set(key, false);
            return false;
        }
    }

    async validateAccess(userId) {
        if (!userId) throw new Error("User ID is required");
        return true;
    }

    async getOrCreateCart(userId, siteSlug) {
        await this.ensureConnection(siteSlug);
        await this.validateAccess(userId);

        const hasCommunityId = await this.hasColumn("carts", "community_id");
        const scoped = hasCommunityId && this.activeCommunityId;

        const selectSql = scoped
            ? `SELECT cart_id FROM carts WHERE user_id = ? AND community_id = ?`
            : `SELECT cart_id FROM carts WHERE user_id = ?`;
        const selectParams = scoped ? [userId, this.activeCommunityId] : [userId];
        const [rows] = await this.db.execute(selectSql, selectParams);
        if (rows.length > 0) return rows[0].cart_id;

        const insertSql = scoped
            ? `INSERT INTO carts (user_id, community_id) VALUES (?, ?)`
            : `INSERT INTO carts (user_id) VALUES (?)`;
        const insertParams = scoped ? [userId, this.activeCommunityId] : [userId];
        const [insert] = await this.db.execute(insertSql, insertParams);
        return insert.insertId;
    }

    async getCartItems(userId, siteSlug) {
        const cartId = await this.getOrCreateCart(userId, siteSlug);

        try {
            const queryWithWeight = `
                SELECT ci.item_id, ci.quantity, pv.variant_id, pv.variant_name, pv.variant_values, pv.price,
                       pv.weight_g,
                       p.product_id, p.name AS product_name, p.image_url AS image_url, p.product_category
                FROM cart_items ci
                JOIN product_variants pv ON ci.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                WHERE ci.cart_id = ?
            `;
            const [rows] = await this.db.execute(queryWithWeight, [cartId]);
            return rows;
        } catch (error) {
            if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
            const queryLegacy = `
                SELECT ci.item_id, ci.quantity, pv.variant_id, pv.variant_name, pv.variant_values, pv.price,
                       p.product_id, p.name AS product_name, p.image_url AS image_url, p.product_category
                FROM cart_items ci
                JOIN product_variants pv ON ci.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                WHERE ci.cart_id = ?
            `;
            const [rows] = await this.db.execute(queryLegacy, [cartId]);
            return rows.map((row) => ({ ...row, weight_g: 0 }));
        }
    }

    async addItem(userId, variantId, quantity = 1, siteSlug) {
        const cartId = await this.getOrCreateCart(userId, siteSlug);

        const [variantRows] = await this.db.execute(
            `SELECT stock, product_id FROM product_variants WHERE variant_id = ?`,
            [variantId],
        );
        if (variantRows.length === 0) throw new Error("Variant not found");
        const stock = Number(variantRows[0].stock || 0);

        const [exist] = await this.db.execute(
            `SELECT item_id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
            [cartId, variantId],
        );
        const currentQtyInCart = exist.length > 0 ? Number(exist[0].quantity || 0) : 0;

        if (currentQtyInCart + quantity > stock) {
            throw new Error(`Requested quantity exceeds stock. Available: ${stock - currentQtyInCart}`);
        }

        if (exist.length > 0) {
            await this.db.execute(
                `UPDATE cart_items SET quantity = quantity + ? WHERE item_id = ?`,
                [quantity, exist[0].item_id],
            );
            return { message: "Quantity updated" };
        }

        await this.db.execute(
            `INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)`,
            [cartId, variantId, quantity],
        );
        return { message: "Item added" };
    }

    async updateItem(userId, variantId, quantity, siteSlug) {
        const cartId = await this.getOrCreateCart(userId, siteSlug);

        const [variantRows] = await this.db.execute(
            `SELECT stock FROM product_variants WHERE variant_id = ?`,
            [variantId],
        );
        if (variantRows.length === 0) throw new Error("Variant not found");

        const stock = Number(variantRows[0].stock || 0);
        if (quantity > stock) throw new Error(`Requested quantity exceeds stock. Available: ${stock}`);

        await this.db.execute(
            `UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND variant_id = ?`,
            [quantity, cartId, variantId],
        );
        return { message: "Item updated" };
    }

    async removeItem(userId, variantId, siteSlug) {
        const cartId = await this.getOrCreateCart(userId, siteSlug);
        await this.db.execute(
            `DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
            [cartId, variantId],
        );
        return { message: "Item removed" };
    }
}

export default new CartModel();
