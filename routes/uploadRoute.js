const upload = require("../middlewares/upload");
const express = require("express");
const uploadRoute = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

uploadRoute.post(
  "/upload-profile-pic",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Update the user's profile picture in the database
      const userId = req.body.userId; // Assuming userId is sent in the request body
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { profilePicture: file.filename },
      });

      res.status(200).json({
        message: "Profile picture uploaded successfully",
        filename: file.filename,
        filePath: `/uploads/${file.filename}`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Error uploading profile picture",
        error: err.message,
      });
    }
  }
);

module.exports = uploadRoute;
