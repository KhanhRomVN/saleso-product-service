const {
  startGetProductByIdConsumer,
  startUpdateStockConsumer,
  startGetProductBySellerIdConsumer,
} = require("./consumers/product-consumer");
const {
  startGetVariantBySkuConsumer,
} = require("./consumers/variant-consumer");

const runAllConsumers = async () => {
  await startGetProductByIdConsumer();
  await startUpdateStockConsumer();
  await startGetVariantBySkuConsumer();
  await startGetProductBySellerIdConsumer();
};

module.exports = {
  runAllConsumers,
};
