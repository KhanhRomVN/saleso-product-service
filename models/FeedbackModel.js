const Joi = require("joi");
const { getDB } = require("../config/mongoDB");
const { ObjectId } = require("mongodb");
const { createError } = require("../services/responseHandler");

const COLLECTION_NAME = "feedbacks";
const COLLECTION_SCHEMA = Joi.object({
  customer_id: Joi.string().required(),
  product_id: Joi.string().required(),
  seller_id: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().required(),
  images: Joi.array().items(Joi.string()),
  reply: Joi.object({
    comment: Joi.string().required(),
    created_at: Joi.date().default(Date.now),
    updated_at: Joi.date().default(Date.now),
  }).optional(),
  created_at: Joi.date().default(Date.now),
  updated_at: Joi.date().default(Date.now),
}).options({ abortEarly: false });

const handleDBOperation = async (operation) => {
  const db = getDB();
  try {
    return await operation(db.collection(COLLECTION_NAME));
  } catch (error) {
    throw createError(
      `Database operation failed: ${error.message}`,
      500,
      "DB_OPERATION_FAILED"
    );
  }
};

const FeedbackModel = {
  create: async (feedbackData) =>
    handleDBOperation(async (collection) => {
      const { error } = COLLECTION_SCHEMA.validate(feedbackData);
      if (error)
        throw createError(
          error.details[0].message,
          400,
          "INVALID_FEEDBACK_DATA"
        );

      await collection.insertOne(feedbackData);
    }),

  reply: async (feedbackId, replyData) =>
    handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(feedbackId) },
        { $set: { reply: replyData } }
      );
      if (result.matchedCount === 0) {
        throw createError("Feedback not found", 404, "FEEDBACK_NOT_FOUND");
      }
      return { message: "Reply added successfully" };
    }),

  delete: async (feedbackId) =>
    handleDBOperation(async (collection) => {
      const result = await collection.deleteOne({
        _id: new ObjectId(feedbackId),
      });
      if (result.deletedCount === 0) {
        throw createError("Feedback not found", 404, "FEEDBACK_NOT_FOUND");
      }
      return { message: "Feedback deleted successfully" };
    }),

  getFeedbackById: async (feedbackId) =>
    handleDBOperation(async (collection) => {
      const feedback = await collection.findOne({
        _id: new ObjectId(feedbackId),
      });
      if (!feedback) {
        throw createError("Feedback not found", 404, "FEEDBACK_NOT_FOUND");
      }
      return feedback;
    }),

  getByProduct: async (productId, page) =>
    handleDBOperation(async (collection) => {
      const skip = (page - 1) * 10;
      const feedbacks = await collection
        .find({ product_id: productId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(10)
        .toArray();
      return {
        message: "Feedbacks retrieved successfully",
        data: feedbacks,
        total: await collection.countDocuments({ product_id: productId }),
      };
    }),

  getBySeller: async ({ seller_id, product_id, customer_id, page }) =>
    handleDBOperation(async (collection) => {
      const filters = {
        seller_id,
        ...(product_id && { product_id }),
        ...(customer_id && { customer_id }),
      };
      const skip = (page - 1) * 10;
      const feedbacks = await collection
        .find(filters)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(10)
        .toArray();
      return {
        message: "Feedbacks retrieved successfully",
        feedbacks,
        total: await collection.countDocuments(filters),
      };
    }),

  getAverageRatingForProduct: async (product_id) =>
    handleDBOperation(async (collection) => {
      const feedbacks = await collection.find({ product_id }).toArray();
      const totalReviews = feedbacks.length;

      if (totalReviews === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: [
            { rating: 1, count: 0 },
            { rating: 2, count: 0 },
            { rating: 3, count: 0 },
            { rating: 4, count: 0 },
            { rating: 5, count: 0 },
          ],
        };
      }

      const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: feedbacks.filter((feedback) => feedback.rating === rating)
          .length,
      }));

      const averageRating =
        feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) /
        totalReviews;

      return {
        averageRating,
        totalReviews,
        ratingDistribution,
      };
    }),
};

module.exports = FeedbackModel;
