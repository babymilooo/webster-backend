import { Request, Response, Router } from "express";
import { msgObj } from "../helpers/msgObj";
import { uploadProject, upload } from "../configs/configMulter";
import {
    updateFile,
    removeSingleFile,
    generateFileUrl,
    getMimeType,
} from "../helpers/uploadImages";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import path from "path";

const projectRouter = Router();

projectRouter.get("/image-project", uploadProject.single("image"), updateImage);
projectRouter.post(
    "/remove-background",
    upload.single("image"),
    removeBackground
);

export { projectRouter };

async function updateImage(req: Request, res: Response) {
    try {
        const file: Express.Multer.File = req.file as any;
        if (!file) return res.status(400).json(msgObj("No image uploaded."));

        //await updateFile(currentUser, "profile", "profilePicture", file);
        //const avatarPath = currentUser.profilePicture ? await generateAvatarPath(currentUser.profilePicture) : null;

        const nameImage = generateFileUrl(file.filename, "projects");
        return res.status(200).json({ image: nameImage });
    } catch (error: any) {
        if (req.file) await removeSingleFile(req.file);
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred while updating the image.")
            );
    }
}

async function removeBackground(req: Request, res: Response) {
    if (!req.file) return res.status(400).send("No image uploaded");

    const format = typeof req.query.format === "string" ? req.query.format : "png";

    const inputPath = req.file.path;
    const formData = new FormData();
    formData.append("size", "auto");
    formData.append(
        "image_file",
        fs.createReadStream(inputPath),
        path.basename(inputPath)
    );

    try {
        const response = await axios.post(
            "https://api.remove.bg/v1.0/removebg",
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    "X-Api-Key": process.env.REMOVE_BG_API_KEY,
                },
                responseType: "arraybuffer",
            }
        );

        const mimeType = getMimeType(format);
        res.set("Content-Type", mimeType);
        return res.send(response.data);
    } catch (error) {
        console.error("Failed to remove background:", error);
        res.status(500).send("Failed to process the image");
    } finally {
        await removeSingleFile(inputPath);
    }
}
