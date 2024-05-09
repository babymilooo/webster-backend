import { hashSync } from "bcrypt";
import { IUserDto, IUserUpdateDto } from "../types/user";
import { emailRegex } from "../helpers/emailRegex";
import axios from "axios";
import { IUser, User } from "../models/user";
import { EmailService } from "./emailService";
import { Types } from "mongoose";

export class UserService {
    static async createHashPassword(password: string): Promise<string> {
        if (new TextEncoder().encode(password).length > 72) {
            throw new Error("Password is too long");
        }

        const passwordHash = hashSync(
            password || "",
            Number(process.env.SALT_ROUNDS)
        );

        return passwordHash;
    }

    static async getRandomUsername() {
        try {
            const response = await axios.get("https://api.namefake.com/");
            const username = response.data.username;
            return username;
        } catch (error) {
            console.error("Error fetching username:", error);
            throw error;
        }
    }

    static async createUser(userDto: IUserDto) {
        if (!emailRegex.test(userDto.email)) {
            throw new Error("Email must be valid");
        }
        if (!userDto.userName)
            userDto.userName = await this.getRandomUsername();

        const hashPassword = await this.createHashPassword(userDto.password);

        const userObj: any = {
            ...userDto,
            passwordHash: hashPassword,
        };
        delete userObj.password;

        try {
            const user = new User(userObj);
            await user.save();
            EmailService.sendVerificationEmail(user);
            return user;
        } catch (error) {
            console.error(error);
            throw new Error("User already exists");
        }
    }

    static async generateAvatarPath(avatarFileName: string) {
        const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
        const avatarBasePath = backendUrl + "/static/avatars/";
        return avatarFileName
            ? avatarBasePath + avatarFileName
            : avatarFileName;
    }

    static async findUserById(id: string | Types.ObjectId) {
        const user = await User.findById(id).exec();
        if (!user) throw new Error("User not found");
        return user;
    }

    static async isUserAdmin(id: string | Types.ObjectId): Promise<boolean> {
        const user = await this.findUserById(id);
        return user.role === "admin";
    }

    static async findAllUsers() {
        return await User.find().exec();
    }

    static async findAllAdmins() {
        return await User.find({ role: "admin" }).exec();
    }

    static async findUserByEmail(email: string) {
        if (!emailRegex.test(email)) throw new Error("Email must be valid");
        return await User.findOne({ email: email }).exec();
    }

    static async updateUser(id: string, updateData: IUserUpdateDto) {
        const updateUser = (await User.findByIdAndUpdate(id, updateData, {
            new: true,
        }).exec()) as IUser | null;
        if (!updateUser) throw new Error("No user found with the given ID");

        if (updateData.email && !updateUser.emailVerified) {
            await EmailService.sendVerificationEmail(updateUser);
        }
        return updateUser;
    }

    static async deleteUser(id: string) {
        return await User.findByIdAndDelete(id).exec();
    }

    static async removeSensitiveData(user: any) {
        const userObject = user.toObject
            ? user.toObject()
            : user._doc
            ? user._doc
            : user;
        if (userObject.profilePicture) {
            const generatedAvatarPath = await this.generateAvatarPath(
                userObject.profilePicture
            );
            if (generatedAvatarPath)
                userObject.profilePicture = generatedAvatarPath;
        }
        delete userObject.passwordHash;
        return userObject;
    }

    static async getPublicUserInfo(user: any) {
        const userObject = user.toObject
            ? user.toObject()
            : user._doc
            ? user._doc
            : user;

        const publicUserInfo = {
            name: userObject.userName,
            email: userObject.email,
            profilePicture: userObject.profilePicture,
        };

        return publicUserInfo;
    }

    
}
