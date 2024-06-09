import { Request, Response, Router } from "express";
import { authGuard } from "../helpers/authGuard";
import { refreshTokenMiddleware } from "../helpers/refreshTokenMiddleware";
import { UserService } from "../services/userService";
import { msgObj } from "../helpers/msgObj";
import { EmailService } from "../services/emailService";
import { passwordRegex } from "../helpers/passwordRegex";
import { compareSync } from "bcrypt";
import { TokenService } from "../services/tokenService";
import { ProjectService } from "../services/projectService";
import { IAuthTokens } from "../types/token";
import { IUserUpdateDto } from "../types/user";
import { uploadAvatars } from "../configs/configMulter";
import {
    updateFile,
    removeSingleFile,
    generateFileUrl,
} from "../helpers/uploadImages";
const userRouter = Router();

userRouter.get(
    "/user-info",
    authGuard,
    refreshTokenMiddleware,
    getUserInfoController
);

userRouter.get("/user-info/:userId", getUserInfoByIdController);

userRouter.get(
    "/verify-email",
    authGuard,
    refreshTokenMiddleware,
    verifyEmailWithAccountController
);

userRouter.patch(
    "/edit-password",
    authGuard,
    refreshTokenMiddleware,
    changePasswordController
);

userRouter.patch(
    "/edit-profile",
    authGuard,
    refreshTokenMiddleware,
    updateProfileController
);

userRouter.delete("/delete-profile", authGuard, deleteAccount);

userRouter.patch(
    "/edit-profile-avatar",
    authGuard,
    refreshTokenMiddleware,
    uploadAvatars.single("avatar"),
    updateAvatar
);

export { userRouter };

async function getUserInfoController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string;
        const user = await UserService.findUserById(userId);
        console.log(await UserService.removeSensitiveData(user));
        res.status(200).json(await UserService.removeSensitiveData(user));
    } catch (error) {
        return res
            .status(500)
            .json(msgObj("An error occurred while fetching user information"));
    }
}

async function verifyEmailWithAccountController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string;
        const currentUser = await UserService.findUserById(userId);
        await EmailService.sendVerificationEmail(currentUser);
        res.status(200).json(msgObj("Verification email successfully sent"));
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json(msgObj(error.message));
        } else {
            res.status(500).json(msgObj("Failed to verify user"));
        }
    }
}

async function changePasswordController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string;
        const { currentPassword, newPassword } = req.body;
        const currentUser = await UserService.findUserById(userId);
        if (!currentPassword || !newPassword)
            return res
                .status(400)
                .json(
                    msgObj("Current password and New password are required.")
                );
        if (!(newPassword as string).trim().match(passwordRegex))
            return res
                .status(400)
                .json(
                    msgObj(
                        "Passwords must be at least 8 characters long, have 1 letter and 1 number and no whitespaces"
                    )
                );

        if (
            currentUser.passwordHash &&
            compareSync(currentPassword, currentUser.passwordHash)
        ) {
            const passwordHash = await UserService.createHashPassword(
                newPassword
            );
            currentUser.passwordHash = passwordHash;
            await currentUser.save();

            await TokenService.deleteAuthTokensFromCookies(res);
            TokenService.invalidateRefreshToken(
                (req as Request & { tokens: IAuthTokens }).tokens.refreshToken
            );

            return res
                .status(200)
                .json(msgObj("Password successfully changed."));
        } else
            return res.status(403).json(msgObj("The password does not match"));
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json(msgObj(error.message));
        } else {
            res.status(500).json(msgObj("Failed to change password"));
        }
    }
}

async function updateProfileController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string;
        const currentUser = await UserService.findUserById(userId);

        const updateData: IUserUpdateDto = { ...req.body };
        if (
            updateData.email &&
            updateData.email?.trim() !== currentUser.email.trim()
        )
            updateData.emailVerified = false;
        const updateInfoUser = await UserService.updateUser(userId, updateData);
        res.status(200).json(
            await UserService.removeSensitiveData(updateInfoUser)
        );
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else res.status(500).json(msgObj("Failed to update profile"));
    }
}

async function getUserInfoByIdController(req: Request, res: Response) {
    try {
        const userId = req.params.userId;
        if (!userId)
            return res.status(400).json(msgObj("Invalid data provided"));

        const user = await UserService.findUserById(userId);
        res.status(200).json(await UserService.getPublicUserInfo(user));
    } catch (error) {
        return res
            .status(500)
            .json(msgObj("An error occurred while fetching user information"));
    }
}

export async function updateAvatar(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string;
        const file: Express.Multer.File = req.file as any;

        if (!file) return res.status(400).json(msgObj("No image uploaded."));

        const currentUser = await UserService.findUserById(userId);
        if (currentUser && currentUser.isRegisteredViaGoogle)
            return res
                .status(403)
                .json(
                    msgObj(
                        "Profile editing is not allowed for users registered via Spotify."
                    )
                );

        await updateFile(currentUser, "profile", "profilePicture", file);
        await currentUser.save();

        const avatarPath = currentUser.profilePicture
            ? generateFileUrl(file.filename, "avatars")
            : null;
        res.status(200).json({ profilePicture: avatarPath });
    } catch (error: any) {
        if (req.file) await removeSingleFile(req.file);
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred while updating the image.")
            );
    }
}

async function deleteAccount(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string;
        await ProjectService.deleteProjectsByUser(userId);
        await UserService.deleteUser(userId);
        await TokenService.deleteAuthTokensFromCookies(res);
        TokenService.invalidateRefreshToken(
            (req as Request & { tokens: IAuthTokens }).tokens.refreshToken
        );
        res.status(200).json(msgObj("Account successfully deleted"));
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json(msgObj(error.message));
        } else {
            res.status(500).json(msgObj("Failed to delete account"));
        }
    }
}
