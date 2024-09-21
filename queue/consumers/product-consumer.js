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
    console.log(`[Product Service] Waiting for messages in ${queue}`);

    channel.consume(queue, async (msg) => {
      const { productId } = JSON.parse(msg.content.toString());
      console.log("Received request for productId:", productId);

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

module.exports = {
  startGetProductByIdConsumer,
};