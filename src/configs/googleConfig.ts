import { OAuth2Client, Credentials } from "google-auth-library";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = `${process.env.FRONTEND_URL}/callback`;

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export async function getUserInfo(tokens: Credentials) {
    oAuth2Client.setCredentials(tokens);
    const res = await oAuth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
    });
    return res.data; 
}

export async function getTokens(code: string) {
    const { tokens } = await oAuth2Client.getToken(code);
    return tokens;
}

export function getGoogleAuthURL(): string {
    const scopes = [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
    ];

    return oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: scopes,
    });
}
