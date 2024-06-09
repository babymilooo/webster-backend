import { Types } from "mongoose";
import { IProject, Project } from "../models/project";
import path from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

export class ProjectService {
    static async getProjectById(id: Types.ObjectId | string) {
        return await Project.findById(id).exec();
    }
    static async getProjectsOfUser(userId: Types.ObjectId | string) {
        return await Project.find({ owner: userId }).exec();
    }
    static async getProjectsOfUserNoJSON(userId: Types.ObjectId | string) {
        return await Project.find({ owner: userId })
            .select("-projectJSON")
            .exec();
    }
    static async createNewProject(data: {
        title: string;
        owner: Types.ObjectId | string;
        projectJSON?: string;
    }) {
        const project = new Project(data);
        await project.save();
        return project;
    }
    static async updateProject(
        id: Types.ObjectId | string,
        data: { title?: string; projectJSON?: string }
    ) {
        return await Project.findByIdAndUpdate({ _id: id }, data).exec();
    }

    static async addImage(projId: Types.ObjectId | string, filename: string) {
        const project = await Project.findById(projId).exec();
        if (!project) throw new Error("Project not found");
        project?.pictures.push(filename);
        await project.save();
        return project;
    }

    static async deleteProject(id: Types.ObjectId | string) {
        const project = await Project.findById(id).exec();
        if (!project) throw new Error("Project not found");
        const files = project.pictures;
        const basePath = path.resolve(
            path.join(__dirname, "..", "..", "static", "projects")
        );

        if (files) {
            for (const f of files) {
                const filePath = path.join(basePath, f);
                try {
                    await unlink(filePath);
                    console.log(`Successfully removed file: ${filePath}`);
                } catch (error) {
                    console.error(`Error removing file: ${filePath}`, error);
                }
            }
        }

        const curThumbnail = project.thumbnail;
        if (curThumbnail) {
            const thumbPath = path.resolve(
                path.join(
                    __dirname,
                    "..",
                    "..",
                    "static",
                    "thumbnails",
                    curThumbnail
                )
            );
            if (existsSync(thumbPath)) {
                try {
                    await unlink(thumbPath);
                    console.log(`Successfully removed thumbnail: ${thumbPath}`);
                } catch (error) {
                    console.error(
                        `Error removing thumbnail: ${thumbPath}`,
                        error
                    );
                }
            }
        }

        await project.deleteOne();
        return;
    }

    static async deleteProjectsByUser(userId: Types.ObjectId | string) {
        const projects = await Project.find({ owner: userId }).exec();
        for (const project of projects) {
            await this.deleteProject(project._id);
        }
        return;
    }

    static async setThumbnail(id: Types.ObjectId | string, filename: string) {
        const project = await Project.findById(id).exec();
        if (!project) throw new Error("Project not found");
        const curThumbnail = project.thumbnail;
        if (curThumbnail) {
            const thumbPath = path.resolve(
                path.join(
                    __dirname,
                    "..",
                    "..",
                    "static",
                    "thumbnails",
                    curThumbnail
                )
            );
            if (existsSync(thumbPath)) {
                unlink(thumbPath);
            }
        }
        project.thumbnail = filename;
        await project.save();
        return project;
    }
}
