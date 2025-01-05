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

    // Query ConversationUser for a shared conversation with userId2
    const sharedConversationUser = await prisma.conversationUser.findFirst({
      where: {
        userId: userId2,
        conversationId: { in: user1ConversationIds },
      },
    });

    // Check if a shared conversation was found
    if (!sharedConversationUser) {
      return null; // No shared conversation exists
    }

    // Now grab Conversation objects based on the shared conversationUser
    const sharedConversation = await prisma.conversation.findUnique({
      where: {
        id: sharedConversationUser.conversationId,
      },
    });

    // If a shared conversation exists, return true; otherwise, false
    return sharedConversation;
  } catch (error) {
    console.error("Error checking conversation existence:", error);
    throw error; // Rethrow the error to handle it higher up if needed
  }
};

const postNewConversation = async (req, res, next) => {
  if (req.body.participant_usernames) {
    let participantUsernames = req.body.participant_usernames;
    // find user objects in DB
    let participantObjects = await Promise.all(
      participantUsernames.map((item) => findUserByUsername(item))
    );
    if (req.body.participant_usernames.length == 2) {
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
            message: true,
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
      // Fetch and return the full conversation (including participants)
      const fullConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          participants: true,
          message: true,
        },
      });
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
        message: true,
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
    let conversationObject = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        message: true,
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
        message: true,
      },
    });
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
        message: true,
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
        message: true,
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

    // Fetch all conversations involving myUserId
    const conversationUsers = await prisma.conversationUser.findMany({
      where: {
        userId: myUserId,
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: true, // Include user details (e.g., username)
              },
            },
          },
        },
      },
    });

    // Extract Conversation IDs from filtered conversations
    const filteredConversationIds = conversationUsers.map(
      (conv) => conv.conversationId
    );

    // Fetch all conversation objects whose IDs are in filteredConversations
    const conversationObjects = await prisma.conversation.findMany({
      where: {
        id: {
          in: filteredConversationIds,
        },
      },
      include: {
        participants: {
          include: {
            user: true, // Include user details
          },
        },
        message: true, // Include messages in the conversation
      },
    });

    // Fetch all users excluding myUserId
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

    // Respond with the required data
    res.json({
      conversationObjects: conversationObjects, // Full conversation objects
      allOtherUsers: allOtherUsers, // All other users excluding myUserId
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
