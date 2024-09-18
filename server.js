//* NPM Package
const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const http = require("http");

// const { connectElasticsearch } = require("./config/elasticsearchClient");

//* Redis
const { connectRedis } = require("./config/redisClient");

//* MongoDB
const { connectDB } = require("./config/mongoDB");

//* Routes
const routes = require("./routes");

//* Error Handling Middleware
const { errorHandler } = require("./middleware/errorHandler");

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
app.use(errorHandler);

//* Start Server
const PORT = process.env.PORT || 8080;

Promise.all([connectDB(), connectRedis()])
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database or Redis", err);
    process.exit(1);
  });
