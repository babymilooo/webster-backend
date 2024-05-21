import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { authRouter } from "./controllers/authController";
import { userRouter } from "./controllers/userController";
import { projectRouter } from "./controllers/projectController";

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

app.use('/static/avatars', express.static('static/avatars'));
app.use('/static/projects', express.static('static/projects'));

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/project", projectRouter);

export default app;
