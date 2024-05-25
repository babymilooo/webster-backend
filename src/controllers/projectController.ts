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
import { ProjectService } from "../services/projectService";
import { authGuard } from "../helpers/authGuard";

const projectRouter = Router();

projectRouter.post("/:id/upload-image", authGuard, uploadProject.single("image"), updateImage);
projectRouter.post(
    "/remove-background",
    authGuard,
    upload.single("image"),
    removeBackground
);
projectRouter.get("/myProjects", authGuard, getProjectOfUserController);
projectRouter.post("/create", authGuard, createProjectController);
projectRouter.get("/:id", authGuard,  getProjectByIdController);
projectRouter.patch("/:id", authGuard, updateProjectController);
projectRouter.delete("/:id", authGuard, deleteProjectController);

export { projectRouter };

async function getProjectByIdController(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;
        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId) return res.status(403).json(msgObj("Project not yours"));
        const data = project?.toObject() as any;
        delete data.pictures;
        return res.json(data);

    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred")
            );
    }
}

async function getProjectOfUserController(req: Request, res: Response) {
    try {
        const id = (req as any).userId;
        const projects = await ProjectService.getProjectsOfUser(id);
        if (!projects) return res.status(404).json(msgObj("User not found"));
        return res.json(projects);

    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred")
            );
    }
}

async function createProjectController(req: Request, res: Response) {
    try {
        const data = req.body;
        const userId = (req as any).userId;

        const project = await ProjectService.createNewProject({ ...data, owner: userId });
        return res.json(project);
        
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred")
            );
    }
    
}

async function deleteProjectController(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId) return res.status(403).json(msgObj("Project not yours"));
        await project.deleteOne();
        return res.sendStatus(200);
        
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred")
            );
    }
}

async function updateProjectController(req: Request, res: Response) {
    try {
        const data = req.body;
        const userId = (req as any).userId;
        const { id } = req.params;

        const project = await ProjectService.getProjectById(id);
        if (!project) return res.status(404).json(msgObj("Project not found"));
        if (project.owner.toString() != userId) return res.status(403).json(msgObj("Project not yours"));
        await ProjectService.updateProject(project._id, data);
        return res.json(project);
        
    } catch (error) {
        if (error instanceof Error) res.status(500).json(msgObj(error.message));
        else
            res.status(500).json(
                msgObj("An error occurred")
            );
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
        if (project.owner.toString() != userId) return res.status(403).json(msgObj("Project not yours"));
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
