import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { authRouter } from "./controllers/authController";
import { userRouter } from "./controllers/userController";

const app = express();

app.use(morgan("dev"));
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(
    cors({
        credentials: true,
        origin: process.env.FRONTEND_URL,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/user", userRouter);

export default app;
