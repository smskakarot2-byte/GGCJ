import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import departmentsRouter from "./departments";
import usersRouter from "./users";
import coursesRouter from "./courses";
import resultsRouter from "./results";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(departmentsRouter);
router.use(usersRouter);
router.use(coursesRouter);
router.use(resultsRouter);
router.use(analyticsRouter);

export default router;
