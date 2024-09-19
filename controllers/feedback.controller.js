const { FeedbackModel, ProductModel } = require("../models");
const { handleRequest, createError } = require("../services/responseHandler");
const { getUserInfo } = require("../producers/user-info-producer");

const FeedbackController = {
  create: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, rating, comment, images = [], reply = {} } = req.body;
      if (!product_id || !rating || !comment) {
        throw createError("Missing required fields", 400, "MISSING_FIELDS");
      }
      const customer_id = req.user._id.toString();
      const product = await ProductModel.getProductById(product_id);
      if (!product) {
        throw createError("Product not found", 404, "PRODUCT_NOT_FOUND");
      }
      const seller_id = product.seller_id;

      const feedbackData = {
        customer_id,
        product_id,
        seller_id,
        rating,
        comment,
        images,
        reply,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await FeedbackModel.create(feedbackData);
      return { message: "Feedback created successfully" };
    }),

  reply: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { feedback_id } = req.params;
      const { comment } = req.body;
      if (!comment) {
        throw createError("Comment is required", 400, "MISSING_COMMENT");
      }
      const seller_id = req.user._id.toString();
      const feedback = await FeedbackModel.getFeedbackById(feedback_id);
      if (!feedback) {
        throw createError("Feedback not found", 404, "FEEDBACK_NOT_FOUND");
      }
      if (seller_id !== feedback.seller_id) {
        throw createError(
          "Unauthorized to reply to this feedback",
          403,
          "UNAUTHORIZED"
        );
      }

      const replyData = {
        comment,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await FeedbackModel.reply(feedback_id, replyData);
      return { message: "Feedback replied successfully" };
    }),

  delete: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { feedbackId } = req.params;
      const user_id = req.user._id.toString();

      const feedback = await FeedbackModel.getById(feedbackId);
      if (!feedback) {
        throw createError("Feedback not found", 404, "FEEDBACK_NOT_FOUND");
      }

      if (feedback.user_id !== user_id && feedback.owner_id !== user_id) {
        throw createError(
          "Unauthorized to delete this feedback",
          403,
          "UNAUTHORIZED"
        );
      }

      await FeedbackModel.delete(feedbackId);
      return { message: "Feedback deleted successfully" };
    }),

  getByProduct: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { productId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;
      const feedbacks = await FeedbackModel.getByProduct(
        productId,
        skip,
        limit
      );

      return await Promise.all(
        feedbacks.map(async (feedback) => {
          const userInfo = await getUserInfo(feedback.customer_id);
          return { ...feedback, username: userInfo.username };
        })
      );
    }),

  getBySeller: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, customer_id, page = 1, limit = 10 } = req.body;
      const seller_id = req.user._id.toString();

      const params = {
        seller_id,
        product_id,
        customer_id,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const feedbackList = await FeedbackModel.getBySeller(params);
      return await Promise.all(
        feedbackList.map(async (feedback) => {
          const userInfo = await getUserInfo(feedback.customer_id);
          return { ...feedback, customer_username: userInfo.username };
        })
      );
    }),

  getProductRating: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { productId } = req.params;
      return await FeedbackModel.getAverageRatingForProduct(productId);
    }),
};

module.exports = FeedbackController;
