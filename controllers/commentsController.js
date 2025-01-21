const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const postWriteAComment = async (req, res, next) => {
  try {
    // get my user id and post id
    const myUserId = parseInt(req.body.myUserId);
    const myPostId = parseInt(req.body.myPostId);
    // create a new comment and return it
    const newComment = await prisma.comment.create({
      data: {
        content: req.body.commentContent,
        postId: myPostId,
        authorId: myUserId,
      },
    });
    return res.status(201).json(newComment);
  } catch (err) {
    return next(err);
  }
};

const postLikeAComment = async (req, res, next) => {
  try {
    // Extract user ID and comment ID from request
    const userId = parseInt(req.body.myUserId);
    const commentId = parseInt(req.body.commentId);

    // Fetch the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { likes: true }, // Only retrieve the 'likes' array
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if the user has already liked the comment
    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // Unlike the comment: Remove user ID from the 'likes' array
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          likes: {
            set: comment.likes.filter((id) => id !== userId), // Remove userId
          },
        },
      });
      return res.status(200).json({ message: "Comment unliked successfully" });
    } else {
      // Like the comment: Add user ID to the 'likes' array
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          likes: {
            push: userId, // Add userId to the array
          },
        },
      });
      return res.status(200).json({ message: "Comment liked successfully" });
    }
  } catch (err) {
    return next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const myUserId = parseInt(req.body.myUserId);
    const commentId = parseInt(req.body.commentId);
    const commentObject = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (commentObject.authorId === myUserId) {
      await prisma.comment.delete({ where: { id: commentObject.id } });
      return res.status(200).json({ message: "Comment deleted successfully." });
    }
  } catch (err) {
    return next(err);
  }
};

const postEditComment = async (req, res, next) => {
  try {
    // get the post id
    const commentId = parseInt(req.body.commentId);
    // create a new post and return it
    const newComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: req.body.commentContent,
      },
    });
    return res.status(201).json(newComment);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  postWriteAComment,
  postLikeAComment,
  deleteComment,
  postEditComment,
};
