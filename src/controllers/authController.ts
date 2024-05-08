import { Request, Response, Router } from "express";

//previously router files

const authRouter = Router();

authRouter.post('/login', loginController);

export { authRouter };

//previously controller files

async function loginController(req: Request, res: Response) {

}
