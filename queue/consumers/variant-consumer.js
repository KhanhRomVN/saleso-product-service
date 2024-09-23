const amqp = require("amqplib");
const { VariantModel } = require("../../models");

const startGetVariantBySkuConsumer = async () => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "get_variant_by_sku_queue";

    await channel.assertQueue(queue, { durable: false });

    channel.consume(queue, async (msg) => {
      const content = JSON.parse(msg.content.toString());
      const { sku } = content;

      try {
        const variant = await VariantModel.getVariantBySku(sku);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(variant)),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      } catch (error) {
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: error.message })),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      }

      channel.ack(msg);
    });
  } catch (error) {
    console.error("Error in getVariantBySku consumer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

module.exports = {
  startGetVariantBySkuConsumer,
};
