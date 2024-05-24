import fs from "fs";
import path from "path";

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

export function getMimeType(format: string) {
    const formats: { [key: string]: string } = {
        png: "image/png",
        jpeg: "image/jpeg",
        jpg: "image/jpeg"
    };

    return formats[format.toLowerCase()] || "image/png";
}
