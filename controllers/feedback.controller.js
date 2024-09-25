const { FeedbackModel, ProductModel } = require("../models");
const { getUserById } = require("../queue/producers/user-producer");
const {
  sendGetAllowNotificationPreference,
} = require("../queue/producers/notification-preference-producer");
const {
  sendCreateNewNotification,
} = require("../queue/producers/notification-producer");
const { handleRequest, createError } = require("../services/responseHandler");

const FeedbackController = {
  create: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, rating, comment, images = [] } = req.body;
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
        created_at: new Date(),
        updated_at: new Date(),
      };

      await FeedbackModel.create(feedbackData);
      // [ get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(seller_id, "seller");
      // create notification
      if (allow_notification_preferences.feedback_notification) {
        const notificationData = {
          title: "New Feedback",
          content: `The customer [${customer_id}] has left a feedback on your product [${product_id}]`,
          notification_type: "feedback_notification",
          target_type: "individual",
          target_ids: [seller_id],
          related: {
            path: `/feedback`,
          },
          can_delete: true,
          can_mark_as_read: true,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }
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
      const customer_id = feedback.customer_id;
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
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(seller_id, "seller");
      // create notification
      if (allow_notification_preferences.feedback_notification) {
        const notificationData = {
          title: "Reply to Feedback",
          content: `The seller [${seller_id}] has replied to your feedback on product [${product_id}]`,
          notification_type: "feedback_notification",
          target_type: "individual",
          target_ids: [customer_id],
          related: {
            path: `/product/${product_id}`,
          },
          can_delete: true,
          can_mark_as_read: true,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }
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
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(seller_id, "seller");
      // create notification
      if (allow_notification_preferences.feedback_notification) {
        let contentData = "";
        if (user_id === feedback.customer_id) {
          contentData = `The customer [${user_id}] has deleted their feedback on your product [${feedback.product_id}]`;
        } else {
          contentData = `The seller [${seller_id}] has deleted your feedback on product [${feedback.product_id}]`;
        }
        const notificationData = {
          title: "Feedback Deleted",
          content: contentData,
          notification_type: "feedback_notification",
          target_type: "group",
          target_ids: [feedback.customer_id, feedback.seller_id],
          can_delete: true,
          can_mark_as_read: false,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }

      await FeedbackModel.delete(feedbackId);
      return { message: "Feedback deleted successfully" };
    }),

  getByProduct: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { productId, page = 1 } = req.params;
      const feedbacks = await FeedbackModel.getByProduct(productId, page);

      return await Promise.all(
        feedbacks.data.map(async (feedback) => {
          const userInfo = await getUserById(feedback.customer_id, "customer");
          return { ...feedback, username: userInfo.username };
        })
      );
    }),

  getBySeller: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id, customer_id, page = 1 } = req.body;
      const seller_id = req.user._id.toString();
      const params = {
        seller_id,
        product_id,
        customer_id,
        page: parseInt(page),
      };

      const feedbackList = await FeedbackModel.getBySeller(params);

      return await Promise.all(
        feedbackList.feedbacks.map(async (feedback) => {
          const userInfo = await getUserById(feedback.customer_id, "customer");
          return { ...feedback, customer_username: userInfo.username };
        })
      );
    }),

  getProductRating: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { productId } = req.params;
      console.log(productId);
      return await FeedbackModel.getAverageRatingForProduct(productId);
    }),
};

module.exports = FeedbackController;
