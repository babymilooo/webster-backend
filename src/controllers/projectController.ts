import { Request, Response, Router } from "express";
import { msgObj } from "../helpers/msgObj";
import { uploadProject, uploadThumbnail } from "../configs/configMulter";
import {
    removeSingleFile,
    generateFileUrl,
    downloadImage,
    removeBgFromImage,
    saveProcessedImage,
    deleteFile,
    renameFile,
    handleAxiosError,
    handleGeneralError,
    convertToPng
} from "../helpers/uploadImages";
import axios from "axios";
import path from "path";

import { ProjectService } from "../services/projectService";
import { authGuard } from "../helpers/authGuard";
const projectRouter = Router();

projectRouter.post(
    "/:id/upload-image",
    authGuard,
    uploadProject.single("image"),
    updateImage
);
projectRouter.post("/remove-background", authGuard, removeBackground);
projectRouter.get("/myProjects", authGuard, getProjectOfUserController);
projectRouter.post("/create", authGuard, createProjectController);
projectRouter.get("/:id", authGuard, getProjectByIdController);
projectRouter.patch("/:id", authGuard, updateProjectController);
projectRouter.delete("/:id", authGuard, deleteProjectController);

projectRouter.patch(
    "/:id/thumbnail",
    authGuard,
    uploadThumbnail.single("image"),
    setThumbnailController
);
projectRouter.get("/:id/thumbnail", authGuard, getThumbnailController);

export { projectRouter };

async function getProjectByIdController(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;
        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId)
            return res.status(403).json(msgObj("Project not yours"));
        const data = project?.toObject() as any;
        delete data.pictures;
        return res.json(data);
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else res.status(500).json(msgObj("An error occurred"));
    }
}

async function getProjectOfUserController(req: Request, res: Response) {
    try {
        const id = (req as any).userId;
        const projects = await ProjectService.getProjectsOfUserNoJSON(id);
        if (!projects) return res.status(404).json(msgObj("User not found"));
        const sanitizedProjects = projects.map((p) => {
            const pObj = p.toObject() as any;
            delete pObj.pictures;
            delete pObj.projectJSON;
            return pObj;
        });
        return res.json(sanitizedProjects);
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else res.status(500).json(msgObj("An error occurred"));
    }
}

async function createProjectController(req: Request, res: Response) {
    try {
        const data = req.body;
        const userId = (req as any).userId;

        const project = await ProjectService.createNewProject({
            ...data,
            owner: userId,
        });
        return res.json(project);
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else res.status(500).json(msgObj("An error occurred"));
    }
}

async function deleteProjectController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId)
            return res.status(403).json(msgObj("Project not yours"));
        await project.deleteOne();
        return res.sendStatus(200);
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else res.status(500).json(msgObj("An error occurred"));
    }
}

async function updateProjectController(req: Request, res: Response) {
    try {
        const data = req.body;
        const userId = (req as any).userId;
        const { id } = req.params;

        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId)
            return res.status(403).json(msgObj("Project not yours"));
        await ProjectService.updateProject(project._id, data);
        return res.json(project);
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else res.status(500).json(msgObj("An error occurred"));
    }
}

async function updateImage(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const file: Express.Multer.File = req.file as any;
        if (!file) return res.status(400).json(msgObj("No image uploaded."));

        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId)
            return res.status(403).json(msgObj("Project not yours"));
        await ProjectService.addImage(project._id, file.filename);

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
    const format =
        typeof req.query.format === "string" ? req.query.format : "png";
    const imageUrl = req.body.imageUrl;
    if (!imageUrl) return res.status(400).send("No image URL provided");

    try {
        const inputFilename = path.basename(imageUrl);
        const inputPath = path.join(
            __dirname,
            "..",
            "..",
            "static",
            "projects",
            inputFilename
        );
        const newInputFilename = `new-${path.basename(inputFilename, path.extname(inputFilename))}.png`;
        let newInputPath = path.join(
            path.dirname(inputPath),
            newInputFilename
        );

        const tempInputFilename = `temp-${path.basename(inputFilename, path.extname(inputFilename))}${path.extname(inputFilename)}`;
        const tempInputPath = path.join(path.dirname(inputPath), tempInputFilename);

        const outputFilename = newInputFilename.replace(
            path.extname(newInputFilename),
            `.${format}`
        );
        const outputPath = path.join(
            path.dirname(newInputPath),
            outputFilename
        );
        
        await downloadImage(imageUrl, tempInputPath);

        await convertToPng(tempInputPath, newInputPath);
        await deleteFile(tempInputPath);

        const processedImage = await removeBgFromImage(
            newInputPath,
            process.env.REMOVE_BG_API_KEY!
        );

        await saveProcessedImage(outputPath, processedImage);
        await deleteFile(inputPath);
        const finalPath = path.join(path.dirname(outputPath), inputFilename);
        await renameFile(outputPath, finalPath);
        const nameImage = generateFileUrl(inputFilename, "projects");
        return res.status(200).json({ image: nameImage });
    } catch (error) {
        if (axios.isAxiosError(error)) handleAxiosError(error, res);
        else handleGeneralError(error, res);
    }
}

async function setThumbnailController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        const projId = req.params.id;
        const file = req.file;
        if (!file) return res.status(400).json(msgObj("No image uploaded."));

        let project = await ProjectService.getProjectById(projId);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId)
            return res.status(403).json(msgObj("Project not yours"));
        project = await ProjectService.setThumbnail(project._id, file.filename);
        const projObj = project.toObject() as any;
        delete projObj.projectJSON;
        delete projObj.pictures;
        return res.status(201).json(projObj);
    } catch (error) {
        if (req.file) await removeSingleFile(req.file);
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred while updating the thumbnail.")
            );
    }
}

async function getThumbnailController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        const projId = req.params.id;

        const project = await ProjectService.getProjectById(projId);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId)
            return res.status(403).json(msgObj("Project not yours"));

        if (!project.thumbnail)
            return res.status(404).json(msgObj("Project has no thumbnail"));
        const thumbPath = path.resolve(
            path.join(
                __dirname,
                "..",
                "..",
                "static",
                "thumbnails",
                project.thumbnail
            )
        );
        return res.sendFile(thumbPath);
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred while getting the thumbnail.")
            );
    }
}
