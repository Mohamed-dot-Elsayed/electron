import { Request, Response, NextFunction, RequestHandler } from "express";
import Joi,{ObjectSchema} from "joi";

function gatherFiles(req: Request): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      Object.values(req.files)
        .flat()
        .forEach((file) => {
          files.push(file);
        });
    }
  }
  return files;
}

export const validate = (
  schema: ObjectSchema | Joi.ObjectSchema,
  target: "body" | "query" | "params" = "body"
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req[target], { abortEarly: false });
      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: error.message,
            details: error.details.map((d) => d.message),
          },
        });
      }
      next(error);
    }
  };
};