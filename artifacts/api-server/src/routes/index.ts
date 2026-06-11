import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { identifyRouter } from "./identify";
import { stripeRouter } from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(identifyRouter);
router.use(stripeRouter);

export default router;
