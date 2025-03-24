const bcryptjs = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const findUserByUsername = async (givenUsername) => {
  try {
    let user = await prisma.user.findUnique({
      where: {
        username: givenUsername,
      },
    });
    return user;
  } catch (err) {
    console.log(err);
  }
};

const createConversationUser = async (givenConversationId, givenUserId) => {
  try {
    let conversationUser = await prisma.conversationUser.create({
      data: {
        conversationId: givenConversationId,
        userId: givenUserId,
      },
    });
    return conversationUser;
  } catch (err) {
    console.log(err);
  }
};

const doesAConversationExist = async (userId1, userId2) => {
  try {
    // Query ConversationUser for conversations involving userId1
    const user1ConversationUsers = await prisma.conversationUser.findMany({
      where: { userId: userId1 },
      select: { conversationId: true },
    });
    // Extract conversation IDs for userId1
    const user1ConversationIds = user1ConversationUsers.map(
      (entry) => entry.conversationId
    );
    // Find all conversations where both users participate
    const sharedConversationUser = await prisma.conversationUser.findMany({
      where: {
        userId: userId2,
        conversationId: { in: user1ConversationIds },
      },
    });
    // Extract the conversation IDs from sharedConversationUser
    const sharedConversationIds = sharedConversationUser.map(
      (entry) => entry.conversationId
    );
    // Fetch all conversations with participants
    const conversations = await prisma.conversation.findMany({
      include: {
        participants: true, // Include participants to count them
        message: { orderBy: { createdAt: "asc" } },
      },
    });
    // Filter conversations with exactly 2 participants and at least 1 message
    const filteredConversations = conversations.filter(
      (conversation) =>
        conversation.participants.length === 2 &&
        conversation.message.length > 0
    );
    // Check if any of sharedConversationIds is in the filteredConversations
    const finalConversation = filteredConversations.filter((conversation) =>
      sharedConversationIds.includes(conversation.id)
    );
    // If no shared conversation exists, return null
    if (finalConversation.length === 0) {
      return null;
    }
    // Return the first matching conversation (or handle multiple matches as needed)
    return finalConversation[0];
  } catch (error) {
    console.error("Error checking conversation existence:", error);
    throw error; // Rethrow the error to handle it higher up if needed
  }
};

const postNewConversation = async (req, res, next) => {
  let participantUsernames = [];
  if (req.body.participant_usernames) {
    participantUsernames = req.body.participant_usernames;
  }
  if (req.body.user1 && req.body.user2) {
    participantUsernames = [req.body.user1, req.body.user2];
  }
  if (participantUsernames.length > 1) {
    // find user objects in DB
    let participantObjects = await Promise.all(
      participantUsernames.map((item) => findUserByUsername(item))
    );
    if (participantUsernames.length == 2) {
      const sharedConversation = await doesAConversationExist(
        participantObjects[0].id,
        participantObjects[1].id
      );
      if (sharedConversation) {
        const fullConversation = await prisma.conversation.findUnique({
          where: { id: sharedConversation.id },
          include: {
            participants: {
              include: {
                user: true, // Include user details (e.g., username)
              },
            },
            message: {
              include: {
                sender: true,
              },
              orderBy: {
                createdAt: "asc", // Order messages by createdAt in ascending order
              },
            },
          },
        });
        return res.status(201).json(fullConversation);
      }
    }
    try {
      // create a conversation in DB
      let conversation = await prisma.conversation.create({
        data: {},
      });
      // create conversations for each user
      await Promise.all(
        participantObjects.map((item) =>
          createConversationUser(conversation.id, item.id)
        )
      );
      // if groupchat, send a starting message in the conversation
      if (participantUsernames.length > 2) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: participantObjects[participantObjects.length - 1].id,
            content: "Groupchat created",
          },
        });
      }
      // Fetch and return the full conversation (including participants)
      const fullConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          participants: {
            include: {
              user: true, // Include user details (e.g., username)
            },
          },
          message: { orderBy: { createdAt: "asc" } },
        },
      });
      // if no user, post a message immediately
      if (!req.user) {
        await prisma.message.create({
          data: {
            conversationId: fullConversation.id,
            senderId: req.user.userId,
            content: req.body.content,
          },
        });
        return res.render("pw");
      }
      return res.status(201).json(fullConversation);
    } catch (err) {
      console.log(err);
      return next(err);
    }
  } else {
    return res.status(400).send(`Invalid request`);
  }
};

const getConversationMessages = async (req, res, next) => {
  try {
    let conversationReq = parseInt(req.params.conversationId);
    let conversationObject = await prisma.conversation.findUnique({
      where: { id: conversationReq },
      include: {
        participants: true,
        message: { orderBy: { createdAt: "asc" } },
      },
    });
    return res.status(201).json(conversationObject);
  } catch (err) {
    return next(err);
  }
};

const postNewMessage = async (req, res, next) => {
  try {
    let conversationId = parseInt(req.body.conversationId);
    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }
    let conversationObject = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        message: { orderBy: { createdAt: "asc" } },
      },
    });
    let userId = parseInt(req.body.userId);
    let newMessage = await prisma.message.create({
      data: {
        conversationId: conversationObject.id,
        senderId: userId,
        content: req.body.content,
      },
    });
    let newConversationObject = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        message: {
          include: {
            sender: true,
          },
          orderBy: {
            createdAt: "asc", // Order messages by createdAt in ascending order
          },
        },
      },
    });
    // if no req.user, render the get-in page
    if (!req.user) {
      return res.render("pw");
    }
    return res.status(201).json(newConversationObject);
  } catch (err) {
    return next(err);
  }
};

const postGroupChatsOfAUser = async (req, res, next) => {
  let userId = parseInt(req.body.userId);
  try {
    // find all conversations the user participates in
    let allChats = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: true,
        message: { orderBy: { createdAt: "asc" } },
      },
    });

    // filter out non-groupchats
    let groupChats = allChats.filter((item) => item.participants.length > 2);
    return res.status(200).json(groupChats);
  } catch (err) {
    return next(err);
  }
};

const getConversationById = async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const conversationObject = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        message: { orderBy: { createdAt: "asc" } },
        participants: true,
      },
    });
    return res.status(200).json(conversationObject);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const postConversationsOfAUser = async (req, res, next) => {
  try {
    const myUserId = parseInt(req.body.myUserId);
    const conversationUsers = await prisma.conversationUser.findMany({
      where: {
        userId: myUserId,
      },
    });
    const conversationIds = conversationUsers.map(
      (conv) => conv.conversationId
    );
    const conversations = await prisma.conversation.findMany({
      where: {
        id: {
          in: conversationIds,
        },
      },
      include: {
        participants: {
          include: {
            user: true, // Include user details
          },
        },
        message: {
          include: {
            sender: true,
          },
          orderBy: {
            createdAt: "asc", // Order messages by createdAt in ascending order
          },
        },
      },
    });
    const allOtherUsers = await prisma.user.findMany({
      where: {
        id: {
          not: myUserId,
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
        bio: true,
      },
    });
    res.json({
      conversationObjects: conversations,
      allOtherUsers: allOtherUsers,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  postNewConversation,
  getConversationMessages,
  postNewMessage,
  postGroupChatsOfAUser,
  getConversationById,
  postConversationsOfAUser,
};
