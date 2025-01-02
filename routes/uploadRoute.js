const upload = require("../middlewares/upload");
const express = require("express");
const uploadRoute = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");

// Require the cloudinary library
const cloudinary = require("cloudinary").v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

uploadRoute.post(
  "/upload-profile-pic",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Upload the image to Cloudinary
      const result = await cloudinary.uploader.upload_stream(
        {
          folder: "profile_pictures", // Optional: specify a folder in Cloudinary
          public_id: uuidv4(), // Generate a unique name for the image
        },
        async (error, image) => {
          if (error) {
            return res.status(500).json({
              message: "Error uploading to Cloudinary",
              error: error.message,
            });
          }

          // Update the user's profile picture in the database with the Cloudinary URL
          const userId = req.body.userId; // Assuming userId is sent in the request body
          await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { profilePicture: image.secure_url }, // Save Cloudinary URL
          });

          res.status(200).json({
            message: "Profile picture uploaded successfully",
            fileUrl: image.secure_url, // Return the Cloudinary URL
          });
        }
      );

      // Write the file buffer to Cloudinary's upload stream
      result.end(file.buffer);
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
