const amqp = require("amqplib");
const { ProductModel } = require("../../models");

const startGetProductByIdConsumer = async () => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "get_product_by_id_queue";

    await channel.assertQueue(queue, { durable: false });

    channel.consume(queue, async (msg) => {
      const { productId } = JSON.parse(msg.content.toString());

      try {
        const product = await ProductModel.getProductById(productId);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(product)),
          { correlationId: msg.properties.correlationId }
        );
      } catch (error) {
        console.error("Error fetching product:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: error.message })),
          { correlationId: msg.properties.correlationId }
        );
      }

      channel.ack(msg);
    });
  } catch (error) {
    console.error("Error in getProductByIdConsumer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

const startUpdateStockConsumer = async () => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "update_stock_queue";

    await channel.assertQueue(queue, { durable: false });

    channel.consume(queue, async (msg) => {
      const { productId, stockValue, sku } = JSON.parse(msg.content.toString());

      try {
        await ProductModel.updateStock(productId, stockValue, sku);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ success: true })),
          { correlationId: msg.properties.correlationId }
        );
      } catch (error) {
        console.error("Error updating stock:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: error.message })),
          { correlationId: msg.properties.correlationId }
        );
      }

      channel.ack(msg);
    });
  } catch (error) {
    console.error("Error in startUpdateStockConsumer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

const startGetProductBySellerIdConsumer = async () => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "get_products_by_seller_id_queue";

    await channel.assertQueue(queue, { durable: false });

    channel.consume(queue, async (msg) => {
      const { sellerId } = JSON.parse(msg.content.toString());

      try {
        const products = await ProductModel.getListProductBySellerId(sellerId);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(products)),
          { correlationId: msg.properties.correlationId }
        );
      } catch (error) {
        console.error("Error fetching products by seller ID:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: error.message })),
          { correlationId: msg.properties.correlationId }
        );
      }

      channel.ack(msg);
    });
  } catch (error) {
    console.error("Error in startGetProductBySellerIdConsumer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

module.exports = {
  startGetProductByIdConsumer,
  startUpdateStockConsumer,
  startGetProductBySellerIdConsumer,
};
