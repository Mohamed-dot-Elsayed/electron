import { Router } from 'express';
import { login ,signup} from '../controller/auth';
import { validate } from '../middlewares/validation';
import { loginSchema, signupSchema } from '../validation/auth';
import { catchAsync } from '../utils/catchAsync';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema),catchAsync( login));
authRouter.post('/signup', validate(signupSchema),catchAsync( signup));
// Export the authRouter to be used in the main app
export default authRouter;