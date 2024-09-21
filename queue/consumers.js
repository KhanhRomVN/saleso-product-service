const { startGetProductByIdConsumer } = require("./consumers/product-consumer");
const { startVariantConsumers } = require("./consumers/variant-consumer");

const runAllConsumers = async () => {
  await startGetProductByIdConsumer();
  await startVariantConsumers();
};

module.exports = {
  runAllConsumers,
};
