const express = require("express");
const { FeedbackController } = require("../controllers");
const {
  authCustomerToken,
  authSellerToken,
  authToken,
} = require("../middleware/authToken");
const router = express.Router();

const routes = [
  {
    method: "post",
    path: "/",
    middleware: [authCustomerToken],
    handler: FeedbackController.create,
  },
  {
    method: "post",
    path: "/reply/:feedback_id",
    middleware: [authSellerToken],
    handler: FeedbackController.reply,
  },
  {
    method: "delete",
    path: "/:feedbackId",
    middleware: [authCustomerToken],
    handler: FeedbackController.delete,
  },
  {
    method: "get",
    path: "/product/:productId",
    handler: FeedbackController.getByProduct,
  },
  {
    method: "post",
    path: "/by-seller",
    middleware: [authSellerToken],
    handler: FeedbackController.getBySeller,
  },
  {
    method: "get",
    path: "/product/:productId/rating",
    handler: FeedbackController.getProductRating,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
