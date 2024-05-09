// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();
import mongoose from "mongoose";
import app from "./app";

const port = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "";

export const mongooseInstancePromise = mongoose.connect(MONGODB_URI);

main();

async function main() {
    if (!MONGODB_URI || MONGODB_URI.length == 0) {
        console.log("MongoDB URI is not set in the enviroment - ending server");
        return;
    }
    try {
        await mongooseInstancePromise;
    } catch (error) {
        console.log(error);
        return;
    }

    app.listen(port, () => {
        /* eslint-disable no-console */
        console.log(`Listening: http://localhost:${port}`);
        /* eslint-enable no-console */
    });
}
