import { Request, Response } from "express";
import {
    httponlyCookiesOption,
    jwtAccessConfig,
    jwtPDFTicketQRCodeConfig,
    jwtPasswordResetConfig,
    jwtRefreshConfig,
    jwtVerificationConfig,
} from "../configs/authConfig";
import { ETokenType, IAuthTokens } from "../types/token";
import jwt from "jsonwebtoken";

export const invalidatedRefreshTokenSet = new Set();

export class TokenService {
    static extractTokens(request: Request, code: number): IAuthTokens | null {
        // Extract the token from the request, you might need to adjust this based on your setup (e.g., from headers, cookies, etc.)
        const accessToken = request.cookies.accessToken;
        const refreshToken = request.cookies.refreshToken;

        if (
            (code === 1 && !refreshToken) ||
            (code === 2 && (!accessToken || !refreshToken))
        )
            return null;

        return { accessToken, refreshToken };
    }

    static invalidateRefreshToken(token: string) {
        return invalidatedRefreshTokenSet.add(token);
    }

    static getConfig(type: ETokenType) {
        switch (type) {
            case ETokenType.Access:
                return jwtAccessConfig;
            case ETokenType.Refresh:
                return jwtRefreshConfig;
            case ETokenType.Verification:
                return jwtVerificationConfig;
            case ETokenType.PasswordReset:
                return jwtPasswordResetConfig;
            case ETokenType.QRCode:
                return jwtPDFTicketQRCodeConfig;
            default:
                throw new Error(`Wrong token type`);
        }
    }

    static async signToken(type: ETokenType, payload: any): Promise<string> {
        const config = this.getConfig(type);
        if (!config.secret) throw new Error("Token Secret not set");
        if (config.expiresIn) {
            return jwt.sign(payload, config.secret, {
                expiresIn: config.expiresIn,
            });
        } else return jwt.sign(payload, config.secret);
    }

    static async verifyToken(type: ETokenType, token: string) {
        if (
            type === ETokenType.Refresh &&
            invalidatedRefreshTokenSet.has(token)
        )
            throw new Error("Token is invalidated");
        const config = this.getConfig(type);
        if (!config.secret) throw new Error("Token Secret not set");
        const decoded = jwt.verify(token, config.secret);
        if (typeof decoded === "string")
            throw new Error("Unexpected token structure");
        return decoded;
    }

    static async signAuthTokens(payload: any): Promise<IAuthTokens> {
        return {
            accessToken: await this.signToken(ETokenType.Access, {
                ...payload,
                timestamp: new Date().getTime(),
            }),
            refreshToken: await this.signToken(ETokenType.Refresh, {
                ...payload,
                timestamp: new Date().getTime(),
            }),
        };
    }

    static async setAuthTokensToCookies(
        res: Response,
        tokens: IAuthTokens
    ): Promise<boolean> {
        res.cookie("refreshToken", tokens.refreshToken, httponlyCookiesOption);
        res.cookie("accessToken", tokens.accessToken, httponlyCookiesOption);
        return true;
    }

    static async deleteAuthTokensFromCookies(res: Response): Promise<boolean> {
        res.clearCookie("refreshToken", httponlyCookiesOption);
        res.clearCookie("accessToken", httponlyCookiesOption);
        // res.clearCookie("access_token_spotify", httponlyCookiesOption);
        return true;
    }

    static async setAuthTokens(res: Response, user: any) {
        const tokenPayload = {
            id: user._id,
            timestamp: new Date().getTime(),
        };
        const tokens = await this.signAuthTokens(tokenPayload);
        await this.setAuthTokensToCookies(res, tokens);
    }

    static async setAccessToken(
        userId: string,
        refreshToken: string
    ): Promise<IAuthTokens> {
        const payload = {
            id: userId,
            timestamp: new Date().getTime(),
        };
        return {
            accessToken: await this.signToken(ETokenType.Access, payload),
            refreshToken: refreshToken,
        };
    }
}
