const express = require("express");
const { DiscountUsageController } = require("../controllers");
const {
  authSellerToken,
  authCustomerToken,
} = require("../middleware/authToken");
const router = express.Router();

const routes = [
  {
    method: "post",
    path: "/",
    middleware: [authCustomerToken],
    handler: DiscountUsageController.newDiscountUsage,
  },
  {
    method: "get",
    path: "/:discount_id",
    middleware: [authSellerToken],
    handler: DiscountUsageController.getDiscountUsageByDiscountId,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
