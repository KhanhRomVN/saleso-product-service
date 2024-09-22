const {
  startGetProductByIdConsumer,
  startUpdateStockConsumer,
} = require("./consumers/product-consumer");
const {
  startGetVariantBySkuConsumer,
} = require("./consumers/variant-consumer");

const runAllConsumers = async () => {
  await startGetProductByIdConsumer();
  await startUpdateStockConsumer();
  await startGetVariantBySkuConsumer();
};

module.exports = {
  runAllConsumers,
};
