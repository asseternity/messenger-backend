const express = require("express");
const indexRoute = express.Router();
const indexController = require("../controllers/indexController");
const conversationsController = require("../controllers/conversationsController");
const profileController = require("../controllers/profileController");
const postsController = require("../controllers/postsController");
const commentsController = require("../controllers/commentsController");
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from the 'Authorization' header

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Token verification failed:", err);
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded; // Attach user data from token to the request object
    next();
  });
};

const restrictGuest = (req, res, next) => {
  if (!req.user) {
    return next();
  }
  if (req.user.username === "Guest") {
    return res
      .status(403)
      .json({ message: "Guest users cannot perform this action" });
  }
  return next();
};

indexRoute.get("/", indexController.getIndex);
indexRoute.get("/fail", indexController.getFailure);
indexRoute.get("/empty", indexController.getEmpty);
indexRoute.post("/sign-up", indexController.postSignUp);
indexRoute.get("/all-users", verifyToken, indexController.getAllUsers);
indexRoute.post(
  "/new-chat",
  verifyToken,
  conversationsController.postNewConversation
);
indexRoute.get(
  "/:conversationId",
  verifyToken,
  conversationsController.getConversationMessages
);
indexRoute.post(
  "/new-message",
  verifyToken,
  restrictGuest,
  conversationsController.postNewMessage
);
indexRoute.post(
  "/group-chats",
  verifyToken,
  conversationsController.postGroupChatsOfAUser
);
indexRoute.get(
  "/conversation/:conversationId",
  verifyToken,
  conversationsController.getConversationById
);
indexRoute.post(
  "/users_conversations",
  verifyToken,
  conversationsController.postConversationsOfAUser
);

// posts routes
indexRoute.post("/new_post", restrictGuest, postsController.postWriteAPost);
indexRoute.post(
  "/update_post",
  restrictGuest,
  verifyToken,
  postsController.updateEditAPost
);
indexRoute.post("/like_post", postsController.postLikeAPost);
indexRoute.post(
  "/get_feed",
  verifyToken,
  postsController.postGetPostsOfFollows
);
indexRoute.post(
  "/delete_post",
  verifyToken,
  restrictGuest,
  postsController.deletePost
);
indexRoute.post("/users_posts", verifyToken, postsController.postGetUsersPosts);
indexRoute.post("/all_posts", verifyToken, postsController.postAllPosts);

// comments routes
indexRoute.post(
  "/new_comment",
  restrictGuest,
  commentsController.postWriteAComment
);
indexRoute.post("/like_comment", commentsController.postLikeAComment);
indexRoute.post(
  "/delete_comment",
  verifyToken,
  restrictGuest,
  commentsController.deleteComment
);
indexRoute.post(
  "/edit_comment",
  verifyToken,
  restrictGuest,
  commentsController.postEditComment
);

// profile routes
indexRoute.get(
  "/user_data/:targetUserId",
  verifyToken,
  profileController.getUserDataById
);
indexRoute.post(
  "/update_profile",
  verifyToken,
  restrictGuest,
  profileController.updateUserProfile
);
indexRoute.post("/follow", verifyToken, profileController.postFollowUnfollow);
indexRoute.post(
  "/search_username",
  verifyToken,
  profileController.postSearchByUsername
);
indexRoute.post(
  "/notifications",
  verifyToken,
  profileController.postNewNotifications
);
indexRoute.post(
  "/notification_update",
  verifyToken,
  profileController.postUpdateNotificationTime
);

module.exports = indexRoute;
