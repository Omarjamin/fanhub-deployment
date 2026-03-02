import express from "express";
import UserController from "../../Controllers/v1/bini_controllers/user-controller.js";
import authenticate from "../../Middlewares/authentication.js";
import authorize from "../../Middlewares/authorization.js";

const userRouter = express.Router();
const userController = new UserController();

userRouter.post("/register", userController.createUser.bind(userController));
userRouter.post("/login", userController.loginUser.bind(userController));
userRouter.post(
  "/request-password-reset",
  userController.requestPasswordReset.bind(userController),
);
userRouter.post(
  "/reset-password",
  userController.resetPassword.bind(userController),
);

userRouter.use(authenticate);

userRouter.get("/all", userController.GetAllUser.bind(userController));

userRouter.get("/profile", userController.getUserProfile.bind(userController));

userRouter.get(
  "/profile/:id",
  userController.getfollowProfile.bind(userController),
);
userRouter.post("/:id/follow", userController.follow.bind(userController));
userRouter.post("/:id/unfollow", userController.unfollow.bind(userController));
userRouter.get(
  "/:id/followers",
  userController.getFollowerList.bind(userController),
);
userRouter.get(
  "/:id/following",
  userController.getFollowingList.bind(userController),
);
userRouter.put("/profile", userController.updateUser.bind(userController));
userRouter.get(
  "/:id/follower-count",
  userController.getFollowerCount.bind(userController),
);
userRouter.get(
  "/:id/is-following",
  userController.isfollowing.bind(userController),
);
userRouter.get(
  "/:id/following-count",
  userController.getFollowingCount.bind(userController),
);
userRouter.post("/logout", userController.logoutUser);
userRouter.get("/:id", userController.GetUser.bind(userController));

userRouter.use(authorize);

export default userRouter;
