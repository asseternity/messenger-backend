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

const postNewConversation = async (req, res, next) => {
  if (req.body.participant_usernames) {
    try {
      let participantUsernames = req.body.participant_usernames;
      // find user objects in DB
      let participantObjects = await Promise.all(
        participantUsernames.map((item) => findUserByUsername(item))
      );
      // create a conversation in DB
      let conversation = await prisma.conversation.create({
        data: {
          participants: [],
          message: [],
        },
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
          messages: true,
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
