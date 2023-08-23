import compression from "compression";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";

import { allowAutoplay } from "./lib/utils/middleware.js";
import { csrf } from "./lib/utils/middleware/csrf.js";

import cookieParser from "cookie-parser";

import { processDir } from "./lib/utils/processDir.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(
  express.urlencoded({
    limit: "5mb",
    extended: true,
  })
);
app.use(compression());

app.use(express.static("public"));
app.use(express.static("dist"));

app.use(cookieParser());
app.disable("x-powered-by");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to API calls only
app.use("/api", apiLimiter);
app.use("/auth/loginGuestUser", apiLimiter);

app.use(csrf);
app.use(allowAutoplay);

processDir(app, "./build/routes/GET", "build/routes/GET", "GET");
processDir(app, "./build/routes/POST", "build/routes/POST", "POST");
processDir(app, "./build/routes/PUT", "build/routes/PUT", "PUT");
processDir(app, "./build/routes/DELETE", "build/routes/DELETE", "DELETE");

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Server running on port ${port}`));
