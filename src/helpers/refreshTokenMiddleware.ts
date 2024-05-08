import { NextFunction, Request, Response } from "express";
import { TokenService } from "../services/tokenService";
import { msgObj } from "./msgObj";

export async function refreshTokenMiddleware(
    req: Request | any,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = (req as any).userId as string;
        const refreshToken = (req as any).tokens.refreshToken as string;
        const tokens = await TokenService.setAccessToken(userId, refreshToken);
        await TokenService.setAuthTokensToCookies(res, tokens);

        //await updateAccessTokenForUser(userId, spotifyApi, res);

        req.userId = userId;
        return next();
    } catch (error) {
        return res
            .status(500)
            .json(msgObj("Failed to generate new access token"));
    }
}
