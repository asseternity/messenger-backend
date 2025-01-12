const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const adminRoute = express.Router();
const adminController = require("../controllers/adminController");

adminRoute.get("/get-in", adminController.getLoginPage);
adminRoute.post("/get-in", adminController.postAdminPanel);
adminRoute.post("/delete-user", adminController.postDeleteUser);

module.exports = adminRoute;
