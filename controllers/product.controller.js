const {
  ProductModel,
  DiscountModel,
  FeedbackModel,
  ProductAnalyticModel,
  ProductLogModel,
} = require("../models");
const logger = require("../config/logger");
const { client } = require("../config/elasticsearchClient");

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

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

const checkUserOwnership = async (product_id, seller_id) => {
  const product = await ProductModel.getProductById(product_id);
  if (!product) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }
  if (product.seller_id.toString() !== seller_id.toString()) {
    const error = new Error("Unauthorized: You don't own this product");
    error.status = 403;
    throw error;
  }
  return product;
};

const ProductController = {
  createProduct: async (req, res) =>
    handleRequest(req, res, async (req) => {
      const productData = req.body;
      const seller_id = req.user._id.toString();
      // create slug
      const baseSlug = slugify(productData.name);
      const uniqueSlug = await ProductModel.getUniqueSlug(baseSlug);
      productData.slug = uniqueSlug;
      // create product
      const product = await ProductModel.createProduct(productData, seller_id);
      // create product analytic
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const productAnalyticData = {
        product_id: product.product_id,
        year,
        month,
        revenue: 0,
        visitor: 0,
        wishlist_additions: 0,
        cart_additions: 0,
        orders_placed: 0,
        orders_cancelled: 0,
        orders_successful: 0,
        reversal: 0,
        discount_applications: 0,
      };
      await ProductAnalyticModel.newProductAnalytic(productAnalyticData);
      // create product log
      const productLogData = {
        product_id: product.product_id,
        title: "Create new product",
        content: `Seller with id-[${seller_id}] has successfully created a product with id-[${product.product_id}]`,
        created_at: new Date(),
      };
      await ProductLogModel.createLog(productLogData);
      return { message: "Create product successfully" };
    }),

  getProductById: (req, res) =>
    handleRequest(req, res, async (req) => {
      const product = await ProductModel.getProductById(req.params.product_id);
      let discountValue = product.discount_value;
      if (product.ongoing_discounts.length > 0) {
        const discounts = await Promise.all(
          product.ongoing_discounts.map((id) =>
            DiscountModel.getDiscountById(id)
          )
        );
        discountValue = Math.max(
          ...discounts.map((discount) => discount.value)
        );
      }
      product.discount_value = discountValue;
      const ratingData = await FeedbackModel.getAverageRatingForProduct(
        product._id
      );
      product.rating = ratingData.averageRating;
      return product;
    }),

  getProductsBySellerId: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { minimum = false } = req.body;
      const products = await ProductModel.getListProductBySellerId(
        req.user._id.toString()
      );
      return products.map((product) => {
        // Calculate price
        let price;
        if (product.variants.length > 1) {
          const prices = product.variants.map((variant) => variant.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          price = `${minPrice}$ - ${maxPrice}$`;
        } else if (product.variants.length === 1) {
          price = product.variants[0].price;
        } else {
          price = null;
        }

        // Calculate total stock
        const stock = product.variants.reduce(
          (total, variant) => total + variant.stock,
          0
        );

        if (minimum) {
          return {
            _id: product._id,
            name: product.name,
            image: product.images[0] || null,
            price: price,
            stock: stock,
          };
        }

        const applied_discounts = [
          ...product.upcoming_discounts,
          ...product.ongoing_discounts,
          ...product.expired_discounts,
        ];

        return {
          _id: product._id,
          name: product.name,
          image: product.images[0] || null,
          origin: product.origin,
          is_active: product.is_active,
          seller_id: product.seller_id,
          price: price,
          stock: stock,
          applied_discounts,
        };
      });
    }),

  getDiscountByProductId: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id } = req.params;
      const product = await ProductModel.getProductById(product_id);

      return product.ongoing_discounts.length > 0
        ? Promise.all(
            product.ongoing_discounts.map((id) =>
              DiscountModel.getDiscountById(id)
            )
          )
        : [];
    }),

  getFlashSaleProducts: (req, res) =>
    handleRequest(req, res, async (req) => {
      const flashSaleProducts = await ProductModel.getFlashSaleProduct();
      return await Promise.all(
        flashSaleProducts.map(async (product) => {
          // Get the lowest price from variants
          const lowestPrice = Math.min(
            ...product.variants.map((variant) => variant.price)
          );

          // Process discount
          let discountValue = product.discount_value;
          if (product.ongoing_discounts.length > 0) {
            const discounts = await Promise.all(
              product.ongoing_discounts.map((id) =>
                DiscountModel.getDiscountById(id)
              )
            );
            discountValue = Math.max(
              ...discounts.map((discount) => discount.value)
            );
          }

          // Get average rating
          const ratingData = await FeedbackModel.getAverageRatingForProduct(
            product._id
          );

          return {
            _id: product._id,
            id: product._id,
            name: product.name,
            image: product.images[0],
            price: lowestPrice,
            discount_value: discountValue,
            rating: ratingData.averageRating,
          };
        })
      );
    }),

  getTopSellingProducts: (req, res) =>
    handleRequest(req, res, async (req) => {
      const limit = parseInt(req.query.limit) || 20;
      const topSellingProducts = await ProductModel.getTopSellProduct(limit);
      return await Promise.all(
        topSellingProducts.map(async (product) => {
          // Get the lowest price from variants
          const lowestPrice = Math.min(
            ...product.variants.map((variant) => variant.price)
          );

          // Process discount
          let discountValue = product.discount_value;
          if (product.ongoing_discounts.length > 0) {
            const discounts = await Promise.all(
              product.ongoing_discounts.map((id) =>
                DiscountModel.getDiscountById(id)
              )
            );
            discountValue = Math.max(
              ...discounts.map((discount) => discount.value)
            );
          }

          // Get average rating
          const ratingData = await FeedbackModel.getAverageRatingForProduct(
            product._id
          );

          return {
            _id: product._id,
            id: product._id,
            name: product.name,
            image: product.images[0],
            price: lowestPrice,
            discount_value: discountValue,
            rating: ratingData.averageRating,
          };
        })
      );
    }),

  getProductsByListProductId: (req, res) =>
    handleRequest(req, res, async (req) => {
      const listProduct = await ProductModel.getProductsByListProductId(
        req.body.productIds
      );
      // const refinedProducts = listProduct.map((product) => ({
      //   _id: product._id,
      //   seller_id: product.seller_id,
      //   name: product.name,
      //   image: product.images[0],
      //   price:
      //     product.price ||
      //     (product.attributes
      //       ? Math.min(
      //           ...product.attributes.map((attr) =>
      //             parseFloat(attr.attributes_price)
      //           )
      //         )
      //       : null),
      // }));

      return listProduct;
    }),

  searchProduct: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { value } = req.body;
      const { page = 1, limit = 10 } = req.query;

      let query = {
        bool: {
          should: [],
        },
      };

      if (value) {
        query.bool.should.push(
          {
            match: {
              name: {
                query: value,
                fuzziness: "AUTO",
              },
            },
          },
          {
            match: {
              tags: {
                query: value,
                fuzziness: "AUTO",
              },
            },
          }
        );
      }

      const result = await client.search({
        index: "products",
        body: {
          query: query,
          from: (page - 1) * limit,
          size: limit,
        },
      });

      const products = result.hits.hits.map((hit) => ({
        _id: hit._id,
        ...hit._source,
      }));

      return {
        total: result.hits.total.value,
        page: parseInt(page),
        limit: parseInt(limit),
        products: products,
      };
    }),

  filterProducts: (req, res) =>
    handleRequest(req, res, async (req) => {
      const { value, rating, address, page = 1, limit = 32 } = req.body;

      const query = {
        bool: {
          must: [],
          should: [],
          filter: [],
        },
      };

      if (value) {
        query.bool.should.push({
          multi_match: {
            query: value,
            fields: [
              "name^2",
              "slug",
              "details.detail_info",
              "origin",
              "categories.category_name",
              "tags",
            ],
            type: "best_fields",
            fuzziness: "AUTO",
            operator: "or",
          },
        });
        query.bool.minimum_should_match = 1;
      }

      if (rating) {
        query.bool.filter.push({
          range: {
            rating: {
              gte: parseFloat(rating),
            },
          },
        });
      }

      if (address) {
        query.bool.should.push({
          match: {
            address: {
              query: address,
              fuzziness: "AUTO",
            },
          },
        });
      }

      const result = await client.search({
        index: "products",
        body: {
          query,
          from: (page - 1) * limit,
          size: limit,
          _source: [
            "product_id",
            "name",
            "images",
            "variants",
            "seller_id",
            "rating",
            "address",
            "origin",
            "categories",
          ],
        },
      });

      const products = result.hits.hits.map((hit) => {
        const { _id, _source } = hit;
        const {
          name,
          images,
          variants,
          seller_id,
          rating,
          address,
          origin,
          categories,
        } = _source;

        return {
          id: _id,
          name,
          image: images && images.length > 0 ? images[0] : null,
          price:
            variants && variants.length > 0
              ? Math.min(...variants.map((v) => v.price))
              : null,
          rating: parseFloat(rating),
          seller_id,
          address,
          origin,
          categories: categories.map((c) => ({
            category_id: c.category_id,
            category_name: c.category_name,
          })),
        };
      });

      const simplifiedProducts = products.map(
        ({ id, name, image, price, rating, seller_id, categories }) => ({
          id,
          name,
          image,
          price,
          rating,
          seller_id,
          categories,
        })
      );

      return {
        total: result.hits.total.value,
        page: parseInt(page),
        limit: parseInt(limit),
        products: simplifiedProducts,
      };
    }),

  updateProduct: async (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id } = req.params;
      const { keys, values } = req.body;
      const seller_id = req.user._id.toString();

      // Check if the user owns the product
      await checkUserOwnership(product_id, seller_id);

      const result = await ProductModel.updateProduct(product_id, keys, values);
      return {
        message: "Product updated successfully",
        modifiedCount: result.modifiedCount,
      };
    }),

  toggleActive: async (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id } = req.params;
      const seller_id = req.user._id.toString();
      await checkUserOwnership(product_id, seller_id);
      await ProductModel.toggleActive(product_id);
      // create product log
      const productLogData = {
        product_id: product_id,
        title: "The seller has changed the active product",
        created_at: new Date(),
      };
      await ProductLogModel.createLog(productLogData);
      return { message: "Update active successfully" };
    }),

  addStock: async (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id } = req.params;
      const { sku, stockValue } = req.body;
      const seller_id = req.user._id.toString();
      await checkUserOwnership(product_id, seller_id);
      if (!Number.isInteger(stockValue) || stockValue <= 0) {
        throw new Error("Stock value must be a positive integer");
      }
      const result = await ProductModel.updateStock(
        product_id,
        stockValue,
        sku
      );
      // create product log
      const productLogData = {
        product_id,
        title: "The seller has added the product to the stock",
        content: `The seller added ${stockValue} product with an SKU of ${sku} to the stock`,
        created_at: new Date(),
      };
      await ProductLogModel.createLog(productLogData);
      return {
        message: "Stock added successfully",
        modifiedCount: result.modifiedCount,
      };
    }),

  delStock: async (req, res) =>
    handleRequest(req, res, async (req) => {
      const { product_id } = req.params;
      const { sku, stockValue } = req.body;
      const seller_id = req.user._id.toString();

      // Check if the user owns the product
      await checkUserOwnership(product_id, seller_id);

      if (!Number.isInteger(stockValue) || stockValue <= 0) {
        throw new Error("Stock value must be a positive integer");
      }

      const product = await ProductModel.getProductById(product_id);
      const variant = product.variants.find((v) => v.sku === sku);

      if (!variant) {
        throw new Error("SKU not found for this product");
      }

      if (variant.stock < stockValue) {
        throw new Error("Insufficient stock to remove");
      }

      const result = await ProductModel.updateStock(
        product_id,
        -stockValue,
        sku
      );
      // create product log
      const productLogData = {
        product_id,
        title: "The seller has removed the product to the stock",
        content: `The seller removed ${stockValue} product with an SKU of ${sku} to the stock`,
        created_at: new Date(),
      };
      await ProductLogModel.createLog(productLogData);
      return {
        message: "Stock removed successfully",
        modifiedCount: result.modifiedCount,
      };
    }),

  deleteProduct: async (req, res) => {
    handleRequest(req, res, async (req) => {
      await ProductModel.deleteProduct(req.params.product_id);
      return { message: "Product deleted successfully" };
    });
  },

  refreshProduct: async (req, res) =>
    handleRequest(req, res, async (req) => {
      const result = await ProductModel.refreshProduct();
      return result;
    }),
};

module.exports = ProductController;
