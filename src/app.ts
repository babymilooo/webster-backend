import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { emailTransport } from "./configs/emailConfig";
import cookieParser from "cookie-parser";

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(
    cors({
        credentials: true,
        origin: process.env.FRONTEND_URL,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());


export default app;
