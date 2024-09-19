const { DiscountModel, ProductModel, ProductLogModel } = require("../models");
const { handleRequest, createError } = require("../services/responseHandler");

const determineDiscountStatus = (start_date, end_date) => {
  const now = new Date();
  if (now < start_date) return "upcoming";
  if (now >= start_date && now <= end_date) return "ongoing";
  return "expired";
};

const checkOwner = async (seller_id, discount_id) => {
  const discount = await DiscountModel.getDiscountById(discount_id);
  if (!discount) {
    throw createError("Discount not found", 404, "DISCOUNT_NOT_FOUND");
  }
  if (discount.seller_id !== seller_id) {
    throw createError(
      "You are not authorized to modify this discount",
      403,
      "UNAUTHORIZED"
    );
  }
  return discount;
};

const DiscountController = {
  createDiscount: (req, res) =>
    handleRequest(req, res, async (req) => {
      const discountData = { ...req.body, seller_id: req.user._id.toString() };
      discountData.start_date = new Date(discountData.start_date);
      discountData.end_date = new Date(discountData.end_date);
      discountData.status = determineDiscountStatus(
        discountData.start_date,
        discountData.end_date
      );
      discountData.is_active = true;
      await DiscountModel.createDiscount(discountData);
      return { message: "Discount created successfully" };
    }),

  getDiscountsBySellerId: (req, res) =>
    handleRequest(req, res, async (req) => {
      return await DiscountModel.getDiscountsBySellerId(
        req.user._id.toString()
      );
    }),

  getDiscountById: (req, res) =>
    handleRequest(req, res, async (req) => {
      return await DiscountModel.getDiscountById(req.params.discount_id);
    }),

  toggleDiscountStatus: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { discount_id } = req.params;
      await checkOwner(req.user._id.toString(), discount_id);
      const updatedDiscount =
        await DiscountModel.toggleDiscountStatus(discount_id);
      if (!updatedDiscount) {
        throw createError(
          "Failed to toggle discount status",
          400,
          "TOGGLE_FAILED"
        );
      }
      return { message: "Discount status toggled successfully" };
    }),

  applyDiscount: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, discount_id } = req.params;
      const discount = await checkOwner(req.user._id.toString(), discount_id);
      if (discount.is_active === false || discount.status === "expired") {
        throw createError(
          "Cannot apply inactive or expired discount",
          400,
          "INVALID_DISCOUNT"
        );
      }
      await DiscountModel.applyDiscount(discount_id, product_id);
      await ProductModel.applyDiscount(
        product_id,
        discount_id,
        discount.status
      );
      const productLogData = {
        product_id,
        title: "Applied Discount To Product",
        content: `The seller [${req.user._id.toString()}] has applied discount [${discount_id}] to product`,
        created_at: new Date(),
      };
      await ProductLogModel.createLog(productLogData);
      return { message: "Discount applied successfully" };
    }),

  removeDiscount: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, discount_id } = req.params;
      const discount = await checkOwner(req.user._id.toString(), discount_id);
      if (discount.status === "expired") {
        throw createError(
          "Cannot remove expired discounts",
          400,
          "EXPIRED_DISCOUNT"
        );
      }
      await DiscountModel.removeDiscount(discount_id, product_id);
      await ProductModel.removeDiscount(
        product_id,
        discount_id,
        discount.status
      );
      const productLogData = {
        product_id,
        title: "Removed Discount From Product",
        content: `The seller [${req.user._id.toString()}] has removed discount [${discount_id}] from product`,
        created_at: new Date(),
      };
      await ProductLogModel.createLog(productLogData);
      return { message: "Discount removed successfully" };
    }),

  deleteDiscount: (req, res) =>
    handleRequest(req, res, async (req) => {
      await checkOwner(req.user._id.toString(), req.params.discount_id);
      const result = await DiscountModel.deleteDiscount(req.params.discount_id);
      if (!result) {
        throw createError("Failed to delete discount", 400, "DELETE_FAILED");
      }
      return { message: "Discount deleted successfully" };
    }),
};

module.exports = DiscountController;
