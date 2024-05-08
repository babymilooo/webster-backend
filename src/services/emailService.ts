import SMTPTransport from "nodemailer/lib/smtp-transport";
import { emailTransport } from "../configs/emailConfig";
import { Options } from "nodemailer/lib/mailer";

export class EmailService {
    static async sendMail(
        mailOptions: Options
    ): Promise<SMTPTransport.SentMessageInfo> {
        return await emailTransport.sendMail(mailOptions);
    }
}
