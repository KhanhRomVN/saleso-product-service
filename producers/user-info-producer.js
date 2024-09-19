const amqp = require("amqplib");

const USER_INFO_QUEUE = "user_info_queue";
const RABBITMQ_URL = process.env.RABBITMQ_URL;

async function getUserInfo(userId) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(USER_INFO_QUEUE, { durable: false });

    const correlationId = generateUuid();

    return new Promise((resolve, reject) => {
      channel.consume(
        "amq.rabbitmq.reply-to",
        (msg) => {
          if (msg.properties.correlationId === correlationId) {
            resolve(JSON.parse(msg.content.toString()));
            setTimeout(() => {
              connection.close();
            }, 500);
          }
        },
        { noAck: true }
      );

      channel.sendToQueue(USER_INFO_QUEUE, Buffer.from(userId), {
        correlationId: correlationId,
        replyTo: "amq.rabbitmq.reply-to",
      });
    });
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    throw error;
  }
}

function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}

module.exports = { getUserInfo };
