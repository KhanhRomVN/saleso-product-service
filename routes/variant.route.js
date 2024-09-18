const express = require("express");
const { VariantController } = require("../controllers");
const router = express.Router();

const routes = [
  {
    method: "post",
    path: "/",
    handler: VariantController.newVariant,
  },
  {
    method: "post",
    path: "/bulk",
    handler: VariantController.bulkCreateVariants,
  },
  {
    method: "get",
    path: "/sku/:sku",
    handler: VariantController.getVariantBySku,
  },
  {
    method: "get",
    path: "/category/:category_id",
    handler: VariantController.getVariantByCategory,
  },
  {
    method: "get",
    path: "/group/:group",
    handler: VariantController.getVariantByGroup,
  },
  {
    method: "put",
    path: "/:sku",
    handler: VariantController.updateVariant,
  },
  {
    method: "delete",
    path: "/group/:group",
    handler: VariantController.deleteGroup,
  },
  {
    method: "delete",
    path: "/:sku",
    handler: VariantController.deleteVariant,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
