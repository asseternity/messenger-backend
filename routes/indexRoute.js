const express = require("express");
const indexRoute = express.Router();
const indexController = require("../controllers/indexController");
const conversationsController = require("../controllers/conversationsController");
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from the 'Authorization' header

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  console.log("Token received:", token);

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

module.exports = indexRoute;
