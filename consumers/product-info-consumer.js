const amqp = require("amqplib");
const { ProductModel } = require("../models");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const PRODUCT_INFO_QUEUE = "product_info_queue";

async function startProductInfoConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(PRODUCT_INFO_QUEUE, { durable: false });

    console.log("Waiting for product info requests...");

    channel.consume(PRODUCT_INFO_QUEUE, async (msg) => {
      const productId = msg.content.toString();
      try {
        const product = await ProductModel.getProductById(productId);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(product)),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      } catch (error) {
        console.error("Error processing product info request:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: "Product not found" })),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      } finally {
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error starting product info consumer:", error);
  }
}

module.exports = { startProductInfoConsumer };
