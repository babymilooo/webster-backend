import { HydratedDocument, Schema, model } from "mongoose";
import { emailRegex } from "../helpers/emailRegex";

export interface ISchemaUser {
    userName: string;
    email: string;
    emailVerified: boolean;
    passwordHash?: string;
    role: "user" | "admin";
    profilePicture?: string;
    isRegisteredViaGoogle?: boolean;
}

const userSchema = new Schema<ISchemaUser>({
    userName: {
        type: String,
        required: false,
        trim: true,
        default: "user",
    },
    email: {
        type: String,
        required() {
            return emailRegex.test(this.email);
        },
        trim: true,
        unique: true,
    },
    emailVerified: {
        type: Boolean,
        required: true,
        default: false,
    },
    passwordHash: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        required: true,
        enum: ["user", "admin"],
        default: "user",
    },
    profilePicture: {
        type: String,
        required: false,
        trim: true,
    },
    isRegisteredViaGoogle: {
        type: Boolean,
        required: false,
        default: false, 
    }
});

export const User = model<ISchemaUser>("User", userSchema);

export type IUser = HydratedDocument<ISchemaUser>;
