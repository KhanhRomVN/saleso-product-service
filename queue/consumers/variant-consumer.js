const amqp = require("amqplib");
const { VariantModel } = require("../../models");

const startVariantConsumers = async () => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Consumer for getVariantBySku
    const getVariantQueue = "get_variant_by_sku_queue";
    await channel.assertQueue(getVariantQueue, { durable: false });
    console.log(`[Product Service] Waiting for messages in ${getVariantQueue}`);

    channel.consume(getVariantQueue, async (msg) => {
      const { sku } = JSON.parse(msg.content.toString());
      console.log("Received request for SKU:", sku);

      try {
        const variant = await VariantModel.getVariantBySku(sku);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(variant)),
          { correlationId: msg.properties.correlationId }
        );
      } catch (error) {
        console.error("Error fetching variant:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: error.message })),
          { correlationId: msg.properties.correlationId }
        );
      }

      channel.ack(msg);
    });

    // Consumer for updateVariantStock
    const updateStockQueue = "update_variant_stock_queue";
    await channel.assertQueue(updateStockQueue, { durable: true });
    console.log(
      `[Product Service] Waiting for messages in ${updateStockQueue}`
    );

    channel.consume(updateStockQueue, async (msg) => {
      const { sku, quantity } = JSON.parse(msg.content.toString());
      console.log(
        `Received stock update request for SKU: ${sku}, Quantity: ${quantity}`
      );

      try {
        await VariantModel.updateVariant(sku, { $inc: { stock: quantity } });
        console.log(`Updated stock for SKU: ${sku}`);
      } catch (error) {
        console.error("Error updating variant stock:", error);
      }

      channel.ack(msg);
    });
  } catch (error) {
    console.error("Error in variant consumers:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

module.exports = {
  startVariantConsumers,
};
