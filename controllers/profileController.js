const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getUserDataById = async (req, res, next) => {
  const targetUserId = parseInt(req.params.targetUserId);
  console.log("got a getUserDataById request from id: ");
  console.log(targetUserId);
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res.status(200).json({ message: "User does not exist" });
    }
    return res.status(200).json(targetUser);
  } catch (err) {
    return next(err);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    // get the data
    const myUserId = parseInt(req.body.myUserId);
    const { newBio, newUsername, newProfilePic } = req.body;
    // validate fields
    if (!newBio && !newProfilePic && !newUsername) {
      return res
        .status(400)
        .json({ message: "At least one field must be updated." });
    }
    // check that the username is unique
    if (newUsername) {
      const existingUser = await prisma.user.findUnique({
        where: { username: newUsername },
      });
      if (existingUser && existingUser.id !== myUserId) {
        return res.status(400).json({
          message: "Username is already taken. Please choose another one.",
        });
      }
    }
    // Update the user
    await prisma.user.update({
      where: { id: myUserId },
      data: {
        bio: newBio,
        profilePicture: newProfilePic,
        username: newUsername,
      },
    });
    return res
      .status(200)
      .json({ message: "User profile updated successfully" });
  } catch (err) {
    return next(err);
  }
};

const postFollowUnfollow = async (req, res, next) => {
  try {
    // get data
    const myUserId = parseInt(req.body.myUserId);
    const targetUserId = parseInt(req.body.targetUserId);
    // check if I am following them
    let myUserObject = await prisma.user.findUnique({
      where: { id: myUserId },
    });
    const amFollowing = myUserObject.following.includes(targetUserId);
    // if I am, unfollow
    if (amFollowing) {
      myUserObject = await prisma.user.update({
        where: { id: myUserId },
        data: {
          following: {
            // Remove targetUserId from following array
            set: myUserObject.following.filter((id) => id !== targetUserId),
          },
        },
      });
      return res.status(200).send(myUserObject);
    } else {
      myUserObject = await prisma.user.update({
        where: { id: myUserId },
        data: {
          following: {
            // Add targetUserId to following array
            push: targetUserId,
          },
        },
      });
      return res.status(200).send(myUserObject);
    }
    // if I am not, follow
  } catch (err) {
    return next(err);
  }
};

const postSearchByUsername = async (req, res, next) => {
  const targetUsername = req.body.targetUsername;
  try {
    const targetUser = await prisma.user.findMany({
      where: {
        username: {
          contains: targetUsername,
          mode: "insensitive",
        },
      },
    });
    return res.status(200).send(targetUser);
  } catch (err) {
    return next(err);
  }
};

const postNewNotifications = async (req, res, next) => {
  try {
    const myUserId = parseInt(req.body.myUserId);
    const myUserObject = await prisma.user.findUnique({
      where: { id: myUserId },
      select: { createdAt: true },
    });
    if (!myUserObject || !myUserObject.createdAt) {
      return res.status(404).json({ error: "User not found or invalid data." });
    }
    // get unread messages
    // const conversationUsers = await prisma.conversationUser.findMany({
    //   where: {
    //     userId: myUserId,
    //   },
    // });
    // const conversationIds = conversationUsers.map(
    //   (conv) => conv.conversationId
    // );
    // const conversations = await prisma.conversation.findMany({
    //   where: {
    //     id: {
    //       in: conversationIds,
    //     },
    //   },
    //   include: {
    //     participants: {
    //       include: {
    //         user: true, // Include user details
    //       },
    //     },
    //     message: {
    //       include: {
    //         sender: true,
    //       },
    //       orderBy: {
    //         createdAt: "asc", // Order messages by createdAt in ascending order
    //       },
    //     },
    //   },
    // });
    // const unreadConversations = conversations.filter((item) => {
    //   const lastMessage = item.message[item.message.length - 1];
    //   return (
    //     lastMessage &&
    //     lastMessage.createdAt.getTime() > myUserObject.createdAt.getTime()
    //   );
    // });
    // get unread comments
    const comments = await prisma.comment.findMany({
      where: {
        author: {
          id: myUserId,
        },
      },
      include: {
        author: {
          select: { username: true },
        },
      },
    });
    const unreadComments = comments.filter((item) => {
      return item.createdAt.getTime() > myUserObject.createdAt.getTime();
    });
    // get unread messages
    const unreadMessages = await prisma.message.findMany({
      where: {
        createdAt: {
          gt: myUserObject.createdAt.getTime(), // Ensure req.body.time is a valid Date object
        },
        conversation: {
          participants: {
            some: {
              userId: myUserId, // Check if the user is a participant
            },
          },
        },
        senderId: {
          not: myUserId, // Exclude messages sent by the user
        },
      },
      include: {
        sender: true, // Include sender details
        conversation: true, // Include conversation details
      },
    });
    return res.status(200).json({
      unreadMessages: unreadMessages,
      unreadComments: unreadComments,
    });
  } catch (err) {
    return next(err);
  }
};

const postUpdateNotificationTime = async (req, res, next) => {
  try {
    const myUserId = parseInt(req.body.myUserId);
    const newCheckTime = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: myUserId },
      data: { createdAt: newCheckTime },
    });
    res.status(200).json({
      message: "createdAt time updated successfully",
      updatedUser,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUserDataById,
  updateUserProfile,
  postFollowUnfollow,
  postSearchByUsername,
  postNewNotifications,
  postUpdateNotificationTime,
};
