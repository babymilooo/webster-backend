import { NextFunction, Request, Response } from "express";
import { ETokenType } from "../types/token";
import { TokenService } from "../services/tokenService";

export async function injectUserIdIfAuthed(
    req: Request | any,
    res: Response,
    next: NextFunction
) {
    try {
        const tokens = TokenService.extractTokens(req, 2);
        if (!tokens) return next();
        const jwtData: any = await TokenService.verifyToken(
            ETokenType.Access,
            tokens.accessToken
        );
        req.userId = jwtData.id;
        req.tokens = tokens;
        return next();
    } catch (error) {
        return next();
    }
}
