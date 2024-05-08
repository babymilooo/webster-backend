import { hashSync } from "bcrypt";

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
}
