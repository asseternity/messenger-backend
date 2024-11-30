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
    return next(err);
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
    return next(err);
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
            participants: true,
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

module.exports = {
  postNewConversation,
  getConversationMessages,
  postNewMessage,
};
