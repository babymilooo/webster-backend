import { Request, Response, Router } from "express";
import { msgObj } from "../helpers/msgObj";
import { uploadProject } from "../configs/configMulter";
import { updateFile, removeSingleFile, generateFileUrl } from "../helpers/uploadImages";

const projectRouter = Router();

projectRouter.get(
    "/image-project",
    uploadProject.single("image"),
    updateImage
);


export { projectRouter };



async function updateImage(req: Request, res: Response) {
    try {
      const file: Express.Multer.File = req.file as any;
      if (!file)
        return res.status(400).json(msgObj("No image uploaded."));
      
      //await updateFile(currentUser, "profile", "profilePicture", file);
      //const avatarPath = currentUser.profilePicture ? await generateAvatarPath(currentUser.profilePicture) : null;
      
      const nameImage = generateFileUrl(file.filename, "projects");
      return res.status(200).json({ image: nameImage });
    } catch (error: any) {
      if (req.file)
        await removeSingleFile(req.file);
      if (error instanceof Error) 
        res.status(500).json(msgObj(error.message));
      else
        res.status(500).json(msgObj("An error occurred while updating the image."));
    }
}