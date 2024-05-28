import fs from "fs";
import path from "path";
import axios from "axios";
import mime from "mime-types";
import FormData from "form-data";
import { Response } from "express";

const nameFolderStatic = "static";

export async function updateFile(
    updateData: any,
    entityType: "project" | "profile",
    fieldname: string,
    file: Express.Multer.File
) {
    if (file && file.path) {
        const normalizedNewFilePath = file.path.replace(/\\/g, "/");
        const filenameOnly = normalizedNewFilePath.split("/").pop();

        let basePath;
        if (entityType === "profile")
            basePath = path.posix.join(nameFolderStatic, "avatars");
        else basePath = path.posix.join(nameFolderStatic, "projects");

        const currentFilename = updateData[fieldname];
        if (currentFilename) {
            const oldFilePath = path.posix.join(basePath, currentFilename);
            await removeSingleFile(oldFilePath);
        }
        updateData[fieldname] = filenameOnly;
    }
}

export async function removeSingleFile(file: Express.Multer.File | string) {
    const filePath = typeof file === "string" ? file : file.path;
    try {
        await fs.promises.unlink(filePath);
        console.log(`Successfully removed file: ${filePath}`);
    } catch (error) {
        console.error(`Error removing file: ${filePath}`, error);
    }
}

export function generateFileUrl(
    filename: string,
    fileNameFolder: string
): string {
    const basePath = process.env.BACKEND_URL;
    return `${basePath}/${nameFolderStatic}/${fileNameFolder}/${filename}`;
}

export async function downloadImage(
    url: string,
    filePath: string
): Promise<void> {
    const writer = fs.createWriteStream(filePath);
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on("finish", () => {
            console.log(`Downloaded ${url} to ${filePath}`);
            resolve();
        });
        writer.on("error", (error) => {
            console.error(`Error downloading ${url}`, error);
            reject(error);
        });
    });
}

export function checkMimeType(filePath: string) {
    const mimeType = mime.lookup(filePath);
    console.log("MIME type:", mimeType);
    if (!mimeType || !mimeType.startsWith("image/"))
        throw new Error("Invalid file type. The file must be an image.");
}

export async function removeBgFromImage(filePath: string, apiKey: string) {
    const formData = new FormData();
    formData.append("size", "auto");
    formData.append("image_file", fs.createReadStream(filePath));

    const response = await axios({
        method: "post",
        url: "https://api.remove.bg/v1.0/removebg",
        data: formData,
        responseType: "arraybuffer",
        headers: {
            ...formData.getHeaders(),
            "X-Api-Key": apiKey,
        },
    });

    if (response.status !== 200) {
        console.error("Error:", response.status, response.statusText);
        throw new Error(`Error: ${response.statusText}`);
    }

    return response.data;
}

export async function saveProcessedImage(filePath: string, data: Buffer) {
    await fs.promises.writeFile(filePath, data);
    console.log(`Image saved successfully as ${filePath}`);
}

export async function deleteFile(filePath: string) {
    await fs.promises.unlink(filePath);
    console.log(`File deleted: ${filePath}`);
}

export async function renameFile(oldPath: string, newPath: string) {
    await fs.promises.rename(oldPath, newPath);
    console.log(`File renamed from ${oldPath} to ${newPath}`);
}

export function handleAxiosError(error: any, res: Response) {
    const errorData = error.response?.data;
    let errorMessage = "Failed to process the image";
    if (Buffer.isBuffer(errorData)) {
        const decodedMessage = errorData.toString("utf8");
        try {
            const parsedMessage = JSON.parse(decodedMessage);
            errorMessage = parsedMessage.errors?.[0]?.detail || errorMessage;
        } catch (parseError) {
            errorMessage = decodedMessage;
        }
    } else if (typeof errorData === "string") {
        errorMessage = errorData;
    }
    console.error("Failed to remove background:", errorMessage);
    return res.status(error.response?.status || 500).send(errorMessage);
}

export function handleGeneralError(error: any, res: Response) {
    if (error instanceof Error) {
        console.error("Failed to remove background:", error.message);
        res.status(500).send(error.message);
    } else {
        console.error("Failed to remove background: unknown error");
        res.status(500).send("Failed to process the image");
    }
}
