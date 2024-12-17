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

module.exports = indexRoute;
