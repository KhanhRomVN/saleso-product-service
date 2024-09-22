const { DiscountModel, ProductModel, ProductLogModel } = require("../models");
const {
  sendGetAllowNotificationPreference,
} = require("../queue/producers/notification-preference-producer");
const {
  sendCreateNewNotification,
} = require("../queue/producers/notification-producer");
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
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(
          req.user._id.toString(),
          req.user.role
        );
      // create notification
      if (allow_notification_preferences.discount_notification) {
        const notificationData = {
          title: "New Discount Created",
          content: `You has created a new discount`,
          notification_type: "discount_notification",
          target_type: "individual",
          target_ids: [req.user._id.toString()],
          related: {
            path: `/discount`,
          },
          can_delete: true,
          can_mark_as_read: true,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }

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
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(
          req.user._id.toString(),
          req.user.role
        );

      // create notification
      if (allow_notification_preferences.discount_notification) {
        const notificationData = {
          title: "Discount Status Toggled",
          content: `The seller [${req.user._id.toString()}] has toggled the status of discount [${discount_id}]`,
          notification_type: "discount_notification",
          target_type: "individual",
          target_ids: [req.user._id.toString()],
          related: {
            path: `/discount`,
          },
          can_delete: true,
          can_mark_as_read: true,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
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
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(
          req.user._id.toString(),
          req.user.role
        );
      // create notification
      if (allow_notification_preferences.discount_notification) {
        const notificationData = {
          title: "Discount Applied",
          content: `The seller [${req.user._id.toString()}] has applied discount [${discount_id}] to product`,
          notification_type: "discount_notification",
          target_type: "individual",
          target_ids: [req.user._id.toString()],
          can_delete: true,
          can_mark_as_read: false,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }
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
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(
          req.user._id.toString(),
          req.user.role
        );
      // create notification
      if (allow_notification_preferences.discount_notification) {
        const notificationData = {
          title: "Discount Removed",
          content: `The seller [${req.user._id.toString()}] has removed discount [${discount_id}] from product`,
          notification_type: "discount_notification",
          target_type: "individual",
          target_ids: [req.user._id.toString()],
          can_delete: true,
          can_mark_as_read: false,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }

      return { message: "Discount removed successfully" };
    }),

  deleteDiscount: (req, res) =>
    handleRequest(req, res, async (req) => {
      await checkOwner(req.user._id.toString(), req.params.discount_id);
      const result = await DiscountModel.deleteDiscount(req.params.discount_id);
      if (!result) {
        throw createError("Failed to delete discount", 400, "DELETE_FAILED");
      }
      // get allow notification preferences
      const allow_notification_preferences =
        await sendGetAllowNotificationPreference(
          req.user._id.toString(),
          req.user.role
        );
      // create notification
      if (allow_notification_preferences.discount_notification) {
        const notificationData = {
          title: "Discount Deleted",
          content: `The seller [${req.user._id.toString()}] has deleted discount [${req.params.discount_id}]`,
          notification_type: "discount_notification",
          target_type: "individual",
          target_ids: [req.user._id.toString()],
          can_delete: true,
          can_mark_as_read: false,
          is_read: false,
          created_at: new Date(),
        };
        await sendCreateNewNotification(notificationData);
      }
      return { message: "Discount deleted successfully" };
    }),
};

module.exports = DiscountController;
