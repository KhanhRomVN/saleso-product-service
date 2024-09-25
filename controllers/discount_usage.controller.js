const { DiscountUsageModel, DiscountModel } = require("../models");
const { handleRequest } = require("../services/responseHandler");

const DiscountUsageController = {
  newDiscountUsage: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { discount_id, product_id, discount_cost } = req.body;
      const customer_id = req.user._id.toString();
      await DiscountModel.useDiscount(discount_id);
      await DiscountUsageModel.newDiscountUsage(
        discount_id,
        customer_id,
        product_id,
        discount_cost
      );
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
