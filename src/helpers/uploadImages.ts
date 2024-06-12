import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { Response } from "express";
import sharp from "sharp";

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

export async function convertToPng(
    inputPath: string,
    outputPath: string
): Promise<string> {
    try {
        console.log("Starting conversion to high-quality PNG with sharp.");
        sharp.cache(false);
        await sharp(inputPath)
            .resize({ width: 1000 })
            .png({ quality: 100 })
            .toFile(outputPath);
        console.log(
            "Image written to high-quality PNG successfully with sharp."
        );
        return outputPath;
    } catch (error) {
        console.error(
            "Error during conversion to high-quality PNG with sharp:",
            error
        );
        throw error;
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
            writer.close();
            resolve();
        });
        writer.on("error", (error) => {
            console.error(`Error downloading ${url}`, error);
            writer.close();
            reject(error);
        });
    });
}

export async function removeBgFromImage(filePath: string, apiKey: string) {
    try {
        const formData = new FormData();
        formData.append("size", "auto");
        formData.append("image_file", fs.createReadStream(filePath));

        console.log("Starting request to Remove.bg...");
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

        console.log("Remove.bg response status:", response.status);
        console.log("Remove.bg response headers:", response.headers);

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(
                "Axios error:",
                error.response?.status,
                error.response?.statusText
            );
            if (error.response?.data) {
                console.error(
                    "Remove.bg response data:",
                    Buffer.from(error.response.data).toString("utf8")
                );
            }
        } else {
            console.error("Unexpected error:", error);
        }
        throw error;
    }
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
