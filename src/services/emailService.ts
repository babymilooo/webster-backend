import SMTPTransport from "nodemailer/lib/smtp-transport";
import {
    GMAIL_USERNAME,
    emailTransport,
    passwordChangeEmail,
    verificationEmail,
} from "../configs/emailConfig";
import { Options } from "nodemailer/lib/mailer";
import { IUser } from "../models/user";
import { ETokenType } from "../types/token";
import { TokenService } from "./tokenService";
import { UserService } from "./userService";

export class EmailService {
    static async sendMail(
        mailOptions: Options
    ): Promise<SMTPTransport.SentMessageInfo> {
        return await emailTransport.sendMail(mailOptions);
    }

    static async sendVerificationEmail(user: IUser) {
        const { _id, email, emailVerified } = user;
        if (emailVerified) return;
        const token = await TokenService.signToken(ETokenType.Verification, {
            _id,
        });
        const emailHtml = verificationEmail(
            `/auth/verify-email/${encodeURIComponent(token)}`
        );
        const opts: Options = {
            to: email,
            from: GMAIL_USERNAME,
            html: emailHtml,
            subject: "Webster Email Verification",
        };
        return await this.sendMail(opts);
    }

    static async sendPasswordResetEmail(email: string) {
        const user = await UserService.findUserByEmail(email);
        if (!user) throw new Error("User not found");
        const token = await TokenService.signToken(ETokenType.PasswordReset, {
            _id: user._id,
            passwordHash: user.passwordHash,
        });
        const emailHtml = passwordChangeEmail(
            `/auth/password-reset/${encodeURIComponent(token)}`
        );
        const opts: Options = {
            to: user.email,
            from: GMAIL_USERNAME,
            html: emailHtml,
            subject: "UEvent Music Password Reset",
        };
        return await this.sendMail(opts);
    }
}
