const { FeedbackModel, UserModel, ProductModel } = require("../models");
const logger = require("../config/logger");

const handleRequest = async (req, res, operation) => {
  try {
    const result = await operation(req);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in ${operation.name}: ${error}`);
    res
      .status(error.status || 500)
      .json({ error: error.message || "Internal Server Error" });
  }
};

const FeedbackController = {
  create: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, rating, comment, images = [], reply = {} } = req.body;
      const customer_id = req.user._id.toString();
      const product = await ProductModel.getProductById(product_id);
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
      const seller_id = req.user._id.toString();
      const feedback = await FeedbackModel.getFeedbackById(feedback_id);
      if (seller_id !== feedback.seller_id) {
        throw new Error("Unauthorized to reply to this feedback");
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
        throw new Error("Feedback not found");
      }

      if (feedback.user_id !== user_id && feedback.owner_id !== user_id) {
        throw new Error("Unauthorized to delete this feedback");
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
          const user = await UserModel.getUserById(
            feedback.customer_id,
            "customer"
          );
          return { ...feedback, username: user.username };
        })
      );
    }),

  getBySeller: async (req, res) =>
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
          const user = await UserModel.getUserById(
            feedback.customer_id,
            "customer"
          );
          return { ...feedback, customer_username: user.username };
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
