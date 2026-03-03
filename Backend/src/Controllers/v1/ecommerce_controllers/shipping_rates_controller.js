import ShippingRatesModel from "../../../Models/ecommerce_model/shipping_rates_model.js";
import { resolveSiteSlug } from "../../../utils/site-scope.js";

class ShippingRatesController {
    constructor() {
        this.shippingRatesModel = new ShippingRatesModel();
    }

    async getShippingRates(req, res) {
        try {
            const province_name = req.body?.province_name ?? req.query?.province_name;
            const total_weight_grams =
                req.body?.total_weight_grams ??
                req.query?.total_weight_grams ??
                0;
            const community_type = resolveSiteSlug(req, res);

            // validation
            if (!province_name) {
                return res.status(400).json({
                    success: false,
                    message: "province_name is required"
                });
            }

            const rateResult = await this.shippingRatesModel.getShippingFee(
                province_name,
                total_weight_grams,
                community_type,
            );
            const shippingFee = Number(rateResult?.shipping_fee || 0);
            const region = rateResult?.region || 'VisMin';

            return res.status(200).json({
                success: true,
                shipping_fee: shippingFee,
                region,
                total_weight_grams: Number(total_weight_grams || 0),
                community_type,
            });

        } catch (error) {
            console.error("Shipping rate error:", error);
            console.error("Error stack:", error.stack);
            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
}

export default ShippingRatesController;
