const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const postWriteAPost = async (req, res, next) => {
  try {
    // get my user id
    const myUserId = parseInt(req.body.myUserId);
    // create a new post and return it
    const newPost = await prisma.post.create({
      data: {
        content: req.body.postContent,
        authorId: myUserId,
      },
    });
    const newPostToServe = await prisma.post.findUnique({
      where: { id: newPost.id },
      include: {
        author: {
          select: {
            username: true,
            profilePicture: true,
          },
        },
      },
    });
    // if no req.user, render the get-in page
    if (!req.user) {
      return res.render("pw");
    }
    return res.status(201).json(newPostToServe);
  } catch (err) {
    return next(err);
  }
};

const updateEditAPost = async (req, res, next) => {
  try {
    // get the post id
    const postId = parseInt(req.body.postId);
    // create a new post and return it
    const newPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content: req.body.postContent,
      },
    });
    return res.status(201).json(newPost);
  } catch (err) {
    return next(err);
  }
};

const postLikeAPost = async (req, res, next) => {
  try {
    // Extract user ID and post ID from request
    const userId = parseInt(req.body.myUserId);
    const postId = parseInt(req.body.postId);

    // Fetch the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { likes: true }, // Only retrieve the 'likes' array
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      // Unlike the post: Remove user ID from the 'likes' array
      await prisma.post.update({
        where: { id: postId },
        data: {
          likes: {
            set: post.likes.filter((id) => id !== userId), // Remove userId
          },
        },
      });
      return res.status(200).json({ message: "Post unliked successfully" });
    } else {
      // Like the post: Add user ID to the 'likes' array
      await prisma.post.update({
        where: { id: postId },
        data: {
          likes: {
            push: userId, // Add userId to the array
          },
        },
      });
      return res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (err) {
    return next(err);
  }
};

const postGetPostsOfFollows = async (req, res, next) => {
  try {
    const myUserId = parseInt(req.body.myUserId);
    const { page = 1, pageSize = 50 } = req.body;
    const myUserObject = await prisma.user.findUnique({
      where: { id: myUserId },
      select: { following: true },
    });
    if (!myUserObject) {
      return res.status(404).json({ error: "User not found" });
    }
    const followingIds = [...myUserObject.following, myUserId];
    if (!followingIds || followingIds.length === 0) {
      return res.status(200).json([]);
    }
    // Fetch posts using a single query with pagination
    const postsToServe = await prisma.post.findMany({
      where: {
        authorId: { in: followingIds }, // Fetch posts by authors the user follows
      },
      include: {
        comments: {
          include: {
            author: {
              select: {
                username: true,
                profilePicture: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        author: {
          select: {
            username: true,
            profilePicture: true,
            bio: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" }, // Optional: Sort posts by newest first
      skip: (page - 1) * pageSize, // Skip posts for pagination
      take: pageSize, // Limit the number of posts
    });
    const usersToServe = await prisma.user.findMany({
      select: {
        profilePicture: true,
        id: true,
        username: true,
      },
    });
    return res.status(200).json({ post: postsToServe, users: usersToServe });
  } catch (err) {
    console.error("Error fetching posts:", err);
    return next(err);
  }
  // get all posts made by the people this user follows
  // but manage the amount:
  // include a "page req object, breaking things by like 50 posts"
};

const deletePost = async (req, res, next) => {
  try {
    const myUserId = parseInt(req.body.myUserId);
    const postId = parseInt(req.body.postId);
    const postObject = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (postObject.authorId === myUserId) {
      await prisma.post.delete({ where: { id: postObject.id } });
      return res.status(200).json({ message: "Post deleted successfully." });
    }
  } catch (err) {
    return next(err);
  }
};

const postGetUsersPosts = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.body.targetUserId);
    const usersPosts = await prisma.post.findMany({
      where: { authorId: targetUserId },
      include: {
        comments: {
          include: {
            author: {
              select: {
                username: true,
                profilePicture: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        author: {
          select: {
            username: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const allUsers = await prisma.user.findMany({
      select: {
        profilePicture: true,
        id: true,
        username: true,
      },
    });
    return res.status(200).json({ post: usersPosts, users: allUsers });
  } catch (err) {
    return next(err);
  }
};

const postAllPosts = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50 } = req.body;
    // Fetch posts using a single query with pagination
    const allPosts = await prisma.post.findMany({
      include: {
        comments: {
          include: {
            author: {
              select: {
                username: true,
                profilePicture: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        author: {
          select: {
            username: true,
            profilePicture: true,
            bio: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" }, // Optional: Sort posts by newest first
      skip: (page - 1) * pageSize, // Skip posts for pagination
      take: pageSize, // Limit the number of post
    });
    const allUsers = await prisma.user.findMany({
      select: {
        profilePicture: true,
        id: true,
        username: true,
      },
    });
    return res.status(200).json({ allPosts: allPosts, users: allUsers });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  postWriteAPost,
  updateEditAPost,
  postLikeAPost,
  postGetPostsOfFollows,
  deletePost,
  postGetUsersPosts,
  postAllPosts,
};
