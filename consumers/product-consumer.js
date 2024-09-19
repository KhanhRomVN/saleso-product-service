const { getChannel } = require("../config/rabbitmq");
const { ProductAnalyticModel } = require("../models");

const handleProductCreated = async (message) => {
  try {
    const { product_id } = message;
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const productAnalyticData = {
      product_id,
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
    console.log(`Product analytic created for product ${product_id}`);
  } catch (error) {
    console.error("Error handling product created message:", error);
  }
};

const startProductConsumer = async () => {
  try {
    const channel = await getChannel();
    const queue = "product_created";

    await channel.assertQueue(queue, { durable: true });
    console.log(`Waiting for messages in queue ${queue}`);

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        handleProductCreated(content);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error starting product consumer:", error);
  }
};

module.exports = { startProductConsumer };
