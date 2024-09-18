const express = require("express");
const { DiscountController } = require("../controllers");
const {
  authSellerToken,
  authToken,
  authCustomerToken,
} = require("../middleware/authToken");
const router = express.Router();

const routes = [
  {
    method: "post",
    path: "/",
    middleware: [authSellerToken],
    handler: DiscountController.createDiscount,
  },
  {
    method: "get",
    path: "/",
    middleware: [authSellerToken],
    handler: DiscountController.getDiscountsBySellerId,
  },
  {
    method: "get",
    path: "/get/:discount_id",
    handler: DiscountController.getDiscountById,
  },
  {
    method: "put",
    path: "/:discount_id/status",
    middleware: [authSellerToken],
    handler: DiscountController.toggleDiscountStatus,
  },
  {
    method: "put",
    path: "/apply/products/:product_id/discounts/:discount_id",
    middleware: [authSellerToken],
    handler: DiscountController.applyDiscount,
  },
  {
    method: "put",
    path: "/remove/products/:product_id/discounts/:discount_id",
    middleware: [authSellerToken],
    handler: DiscountController.removeDiscount,
  },
  {
    method: "delete",
    path: "/discount_id",
    middleware: [authSellerToken],
    handler: DiscountController.deleteDiscount,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
