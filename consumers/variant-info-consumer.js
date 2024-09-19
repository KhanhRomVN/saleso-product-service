const amqp = require("amqplib");
const { VariantModel } = require("../models");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const VARIANT_INFO_QUEUE = "variant_info_queue";

async function startVariantInfoConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(VARIANT_INFO_QUEUE, { durable: false });

    console.log("Waiting for variant info requests...");

    channel.consume(VARIANT_INFO_QUEUE, async (msg) => {
      const sku = msg.content.toString();
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
        console.error("Error processing variant info request:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: "Variant not found" })),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      } finally {
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error starting variant info consumer:", error);
  }
}

module.exports = { startVariantInfoConsumer };
