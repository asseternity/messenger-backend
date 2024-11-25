const express = require("express");
const indexRoute = express.Router();
const indexController = require("../controllers/indexController");

indexRoute.get("/", indexController.getIndex);
indexRoute.get("/fail", indexController.getFailure);
indexRoute.get("/empty", indexController.getEmpty);
indexRoute.post("/sign-up", indexController.postSignUp);

module.exports = indexRoute;
