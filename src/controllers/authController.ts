import { Request, Response, Router } from "express";
import { ILoginDto, IRegisterDto } from "../types/auth";
import { UserService } from "../services/userService";
import { msgObj } from "../helpers/msgObj";
import { compareSync } from "bcrypt";
import { TokenService } from "../services/tokenService";
import { passwordRegex } from "../helpers/passwordRegex";
import { ETokenType, IAuthTokens } from "../types/token";
import { authGuard } from "../helpers/authGuard";
import { EmailService } from "../services/emailService";
import { JwtPayload } from "jsonwebtoken";
import { FRONTEND_URL } from "../configs/emailConfig";

//previously router files

const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/register", registerController);
authRouter.post("/logout", authGuard, logoutController);
authRouter.post("/refreshToken", refreshAccessTokenController);
authRouter.get("/check-auth", checkAccessTokenController);
authRouter.post("/verify-email/:token", verificateEmail);
authRouter.post("/verify-email/send-email", sendVerificationEmailController);
authRouter.post("/password-reset/send-email", sendPasswordResetEmailController);
authRouter.post("/password-reset/:token", resetPasswordController);

export { authRouter };

//previously controller files

async function loginController(req: Request, res: Response) {
    try {
        const loginInfo: ILoginDto = req.body;

        const user = await UserService.findUserByEmail(loginInfo.email);

        if (!user) return res.status(404).json(msgObj("User not found"));

        if (
            typeof user.passwordHash !== "string" ||
            typeof loginInfo.password !== "string"
        )
            return res
                .status(400)
                .json(msgObj("Email and password are required"));

        if (!compareSync(loginInfo.password, user.passwordHash))
            return res.status(403).json(msgObj("Email or password is invalid"));

        await TokenService.setAuthTokens(res, user);
        return res
            .status(200)
            .json(await UserService.removeSensitiveData(user));
    } catch (error) {
        return res.status(400).json(msgObj("Invalid data"));
    }
}

async function registerController(req: Request, res: Response) {
    try {
        const registerInfo: IRegisterDto = req.body;
        if (!registerInfo.password.trim().match(passwordRegex))
            return res
                .status(400)
                .json(
                    msgObj(
                        "Passwords must be at least 8 characters long, have 1 letter and 1 number and no whitespaces"
                    )
                );
        await UserService.createUser(registerInfo);
        return res.sendStatus(201);
    } catch (error) {
        return res
            .status(409)
            .json(msgObj("User with this email already exists"));
    }
}

async function logoutController(req: Request, res: Response) {
    await TokenService.deleteAuthTokensFromCookies(res);
    TokenService.invalidateRefreshToken(
        (req as Request & { tokens: IAuthTokens }).tokens.refreshToken
    );
    return res.sendStatus(200);
}

async function refreshAccessTokenController(req: Request, res: Response) {
    try {
        // console.log(invalidatedRefreshTokenSet);

        const inputTokens = TokenService.extractTokens(req, 1);
        if (!inputTokens) return res.status(401).json(msgObj("Not Authorized"));
        // console.log(inputTokens);
        let decoded = null;
        try {
            decoded = await TokenService.verifyToken(
                ETokenType.Refresh,
                inputTokens.refreshToken
            );
        } catch (error) {
            return res.status(401).json(msgObj("Could not verify Token"));
        }

        const user = await UserService.findUserById(decoded.id);

        const tokens = await TokenService.setAccessToken(
            user.id,
            inputTokens.refreshToken
        );
        await TokenService.setAuthTokensToCookies(res, tokens);
        // await setAuthTokens(res, user);
        return res
            .status(200)
            .json(await UserService.removeSensitiveData(user));
    } catch (error) {
        return res.status(400).json(msgObj("Invalid data"));
    }
}

async function checkAccessTokenController(req: Request, res: Response) {
    try {
        const tokens = TokenService.extractTokens(req, 2);
        if (!tokens) return res.status(401).json(msgObj("Not Authorized"));
        const jwtData: any = await TokenService.verifyToken(
            ETokenType.Access,
            tokens.accessToken
        );

        if (!jwtData) res.status(401).json(msgObj("Not Authorized"));

        res.status(200).json(true);
    } catch (error) {
        return res.status(401).json(msgObj("Not Authorized"));
    }
}

async function sendVerificationEmailController(req: Request, res: Response) {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json(msgObj("Email is required"));

        const user = await UserService.findUserByEmail(email);
        if (!user) return res.status(404).json(msgObj("User not found"));
        await EmailService.sendVerificationEmail(user);
        return res.sendStatus(200);
    } catch (error) {
        console.error(error);
        return res.status(500).json(msgObj("Error"));
    }
}

async function verificateEmail(req: Request, res: Response) {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json(msgObj("Token is required"));

        let data: JwtPayload = {};
        try {
            data = await TokenService.verifyToken(
                ETokenType.Verification,
                token
            );
        } catch (error) {
            return res.status(403).json(msgObj("Invalid token"));
        }

        const { _id } = data;
        const user = await UserService.findUserById(_id);
        if (!user) throw new Error("User not found");
        user.emailVerified = true;
        await user.save();
        return res.redirect(`${FRONTEND_URL}/verify-email`);
    } catch (error) {
        console.error(error);
        return res.status(404).json(msgObj("User not found"));
    }
}

async function sendPasswordResetEmailController(req: Request, res: Response) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json(msgObj("Email is required"));
        EmailService.sendPasswordResetEmail(email);
        return res.sendStatus(200);
    } catch (error) {
        console.error(error);
        return res.sendStatus(200);
    }
}

async function resetPasswordController(req: Request, res: Response) {
    try {
        const { password } = req.body;
        const { token } = req.params;
        if (!token) return res.status(400).json(msgObj("Token is required"));
        if (!password)
            return res.status(400).json(msgObj("Password is required"));
        if (!password.trim().match(passwordRegex))
            return res
                .status(400)
                .json(
                    msgObj(
                        "Passwords must be at least 8 characters long, have 1 letter and 1 number and no whitespaces"
                    )
                );
        let data: JwtPayload = {};
        try {
            data = await TokenService.verifyToken(
                ETokenType.PasswordReset,
                token
            );
        } catch (error) {
            return res.status(403).json(msgObj("Invalid token"));
        }

        const { _id, passwordHash } = data;
        const user = await UserService.findUserById(_id);
        if (!user) return res.status(404).json(msgObj("User not found"));
        if (user.passwordHash != passwordHash)
            return res.status(403).json(msgObj("Token is already used"));

        user.passwordHash = await UserService.createHashPassword(password);
        await user.save();
        return res.sendStatus(200);
    } catch (error: any) {
        console.error(error);
        return res.status(403).json(msgObj(error.message || "Forbidden"));
    }
}
