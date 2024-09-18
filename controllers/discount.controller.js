const {
  DiscountModel,
  ProductModel,
  ProductLogModel,
  DiscountUsageModel,
} = require("../models");
const logger = require("../config/logger");

const { AppError, handleError } = require("../service/errorHandler");

const handleRequest = async (req, res, operation) => {
  try {
    const result = await operation(req);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, res);
  }
};

const determineDiscountStatus = (start_date, end_date) => {
  const now = new Date();
  if (now < start_date) return "upcoming";
  if (now >= start_date && now <= end_date) return "ongoing";
  return "expired";
};

const checkOwner = async (seller_id, discount_id) => {
  const discount = await DiscountModel.getDiscountById(discount_id);
  if (!discount) {
    throw new AppError("Discount not found", 404);
  }
  if (discount.seller_id !== seller_id) {
    throw new AppError("You are not authorized to modify this discount", 403);
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
        throw new AppError("Failed to toggle discount status", 400);
      }
      return {
        message: "Discount status toggled successfully",
      };
    }),

  applyDiscount: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, discount_id } = req.params;
      const discount = await checkOwner(req.user._id.toString(), discount_id);
      if (discount.is_active === false || discount.status === "expired") {
        throw new AppError("Cannot apply inactive or expired discount", 400);
      }
      await DiscountModel.applyDiscount(discount_id, product_id);
      await ProductModel.applyDiscount(
        product_id,
        discount_id,
        discount.status
      );
      // create product log
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
        throw new AppError("Cannot remove expired discounts", 400);
      }
      await DiscountModel.removeDiscount(discount_id, product_id);
      await ProductModel.removeDiscount(
        product_id,
        discount_id,
        discount.status
      );
      // create product log
      const productLogData = {
        product_id,
        title: "Removed Discount To Product",
        content: `The seller [${req.user._id.toString()}] has removed discount [${discount_id}] to product`,
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
        throw new AppError("Failed to delete discount", 400);
      }
      return { message: "Discount deleted successfully" };
    }),
};

module.exports = DiscountController;
