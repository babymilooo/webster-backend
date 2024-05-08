import { createTransport } from "nodemailer";

export const GMAIL_USERNAME = process.env.GMAIL_USERNAME;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const BACKEND_URL = process.env.BACKEND_URL;

export const emailTransport = createTransport({
    service: "gmail",
    auth: {
        user: GMAIL_USERNAME,
        pass: GMAIL_APP_PASSWORD,
    },
});
