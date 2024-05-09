export interface IUserDto {
    userName?: string;
    email: string;
    password: string;
    emailVerified?: boolean;
    role?: string;
    profilePicture?: string;
}

export interface IUserUpdateDto {
    userName?: string;
    email?: string;
    role?: string;
    emailVerified?: boolean;
}
