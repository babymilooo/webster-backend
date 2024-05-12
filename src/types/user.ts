export interface IUserDto {
    userName?: string;
    email: string;
    password: string;
    emailVerified?: boolean;
    role?: string;
    profilePicture?: string;
    isRegisteredViaGoogle?: boolean;
}

export interface IUserUpdateDto {
    userName?: string;
    email?: string;
    role?: string;
    emailVerified?: boolean;
    profilePicture?: string;
}
