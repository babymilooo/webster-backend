import { NextFunction, Request, Response } from "express";
import { TokenService } from "../services/tokenService";
import { msgObj } from "./msgObj";
import { ETokenType } from "../types/token";

export async function authGuard(
    req: Request | any,
    res: Response,
    next: NextFunction
) {
    try {
        const tokens = TokenService.extractTokens(req, 2);
        if (!tokens) return res.status(401).json(msgObj("Not Authorized"));
        const jwtData: any = await TokenService.verifyToken(
            ETokenType.Access,
            tokens.accessToken
        );
        req.userId = jwtData.id;
        req.tokens = tokens;
        return next();
    } catch (error) {
        return res.status(401).json(msgObj("Not Authorized"));
    }
}
