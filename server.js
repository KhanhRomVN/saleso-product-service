//* NPM Package
const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const http = require("http");

//* Redis
const { connectRedis } = require("./config/redisClient");

//* Elasticsearch
const { connectElasticsearch } = require("./config/elasticsearchClient");

//* MongoDB
const { connectDB } = require("./config/mongoDB");

//* RabbitMQ
const { connectRabbitMQ } = require("./config/rabbitmq");

//* Routes
const routes = require("./routes");

//* Error Handling Middleware
const { sendError } = require("./services/responseHandler");

//* Product Consumer
const { startProductConsumer } = require("./consumers/product-consumer");

//* CORS Configuration
const whiteList = process.env.WHITE_LIST.split(",");
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const app = express();
const server = http.createServer(app);

//* Middleware
app.use(express.static("public"));
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//* Check Routes
app.get("/", (req, res) => {
  res.json({ message: `Server running at ${process.env.PORT}` });
});

//* API Routes
Object.entries(routes).forEach(([path, router]) => {
  app.use(`/${path}`, router);
});

//* Error Handling Middleware
app.use((err, res) => {
  sendError(res, err);
});

const {
  startProductInfoConsumer,
} = require("./consumers/product-info-consumer");
const {
  startVariantInfoConsumer,
} = require("./consumers/variant-info-consumer");

//* Start Server
const PORT = process.env.PORT || 8084;

Promise.all([
  connectDB(),
  connectRedis(),
  connectRabbitMQ(),
  connectElasticsearch(),
])
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
    startProductInfoConsumer();
    startVariantInfoConsumer();
    startProductConsumer();
  })
  .catch((err) => {
    console.error("Failed to connect to database, Redis, or RabbitMQ", err);
    process.exit(1);
  });
