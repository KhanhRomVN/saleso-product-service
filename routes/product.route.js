const express = require("express");
const { ProductController } = require("../controllers");
const { authSellerToken } = require("../middleware/authToken");
const router = express.Router();

const routes = [
  {
    method: "post",
    path: "/",
    middleware: [authSellerToken],
    handler: ProductController.createProduct,
  },
  {
    method: "get",
    path: "/by-product/:product_id",
    handler: ProductController.getProductById,
  },
  {
    method: "post",
    path: "/by-seller",
    middleware: [authSellerToken],
    handler: ProductController.getProductsBySellerId,
  },
  {
    method: "get",
    path: "/by-product-with-discount/:product_id",
    handler: ProductController.getDiscountByProductId,
  },
  {
    method: "post",
    path: "/flash-sale",
    handler: ProductController.getFlashSaleProducts,
  },
  {
    method: "post",
    path: "/top-sell",
    handler: ProductController.getTopSellingProducts,
  },
  {
    method: "post",
    path: "/get/recommend-product",
    handler: ProductController.getProductsByListProductId,
  },
  // Search products by name and tag
  {
    method: "post",
    path: "/elastic/search",
    handler: ProductController.searchProduct,
  },
  // Search for products via name, country, brand, tag. In addition, there is also the ability to filter products by price (arrange highest or lowest selling price), units_sold (sort sold products) and sort rate (level of product rating).
  {
    method: "post",
    path: "/elastic/filter",
    handler: ProductController.filterProducts,
  },
  {
    method: "put",
    path: "/update/:product_id",
    middleware: [authSellerToken],
    handler: ProductController.updateProduct,
  },
  {
    method: "put",
    path: "/toggle/:product_id",
    middleware: [authSellerToken],
    handler: ProductController.toggleActive,
  },
  {
    method: "put",
    path: "/add-stock/:product_id",
    middleware: [authSellerToken],
    handler: ProductController.addStock,
  },
  {
    method: "delete",
    path: "/del-stock/:product_id",
    middleware: [authSellerToken],
    handler: ProductController.delStock,
  },
  {
    method: "delete",
    path: "/delete/:product_id",
    middleware: [authSellerToken],
    handler: ProductController.deleteProduct,
  },
  // admin only: when using this function, the server deletes all data of the elasticsearch "products" index. Then it retrieves all data of the "products" collection from mongoDB and reassigns it to the elasticsearch "products" index.
  {
    method: "get",
    path: "/refresh/products",
    handler: ProductController.refreshProduct,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
