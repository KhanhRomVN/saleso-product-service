const { DiscountUsageModel } = require("../models");
const { handleRequest, createError } = require("../services/responseHandler");

const DiscountUsageController = {
  newDiscountUsage: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { discount_id, product_id, discount_cost } = req.body;
      const customer_id = req.user._id.toString();
      const discountUsage = await DiscountUsageModel.newDiscountUsage(
        discount_id,
        customer_id,
        product_id,
        discount_cost
      );
      return discountUsage;
    }),

  getDiscountUsageByDiscountId: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { discount_id } = req.params;
      const discountUsage =
        await DiscountUsageModel.getDiscountUsageByDiscountId(discount_id);
      return discountUsage;
    }),
};

module.exports = DiscountUsageController;
