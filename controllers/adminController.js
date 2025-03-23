const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getLoginPage = async (req, res, next) => {
  res.render("pw");
};

const postAdminPanel = async (req, res, next) => {
  try {
    const pw = req.body.adminPassword;
    const login = req.body.login;
    if (
      pw !== process.env.ADMIN_PASSWORD ||
      login !== process.env.ADMIN_LOGIN
    ) {
      return res.status(403).send("Unauthorized: Incorrect admin password.");
    }
    // Pagination settings
    const itemsPerPage = 10000000;
    const messagePage = parseInt(req.query.messagePage || 1);
    const postPage = parseInt(req.query.postPage || 1);
    const commentPage = parseInt(req.query.commentPage || 1);

    // Fetch all users (not paginated)
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Paginated messages
    const messages = await prisma.message.findMany({
      skip: (messagePage - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: true,
        conversation: {
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Paginated posts
    const posts = await prisma.post.findMany({
      skip: (postPage - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: true,
      },
    });

    // Paginated comments
    const comments = await prisma.comment.findMany({
      skip: (commentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: true,
        post: true,
      },
    });

    // Map each message to include the recipient's username
    const mappedMessages = messages.map((message) => {
      const recipient = message.conversation.participants.find(
        (participant) => participant.userId !== message.senderId
      );
      return {
        ...message,
        recipient: recipient ? recipient.user : null,
      };
    });

    // Map comments to include the post content
    const mappedComments = comments.map((comment) => ({
      ...comment,
      postContent: comment.post.content,
    }));

    // Render the panel.ejs view with users, paginated messages, posts, and comments
    res.render("panel", {
      users,
      messages: mappedMessages,
      posts,
      comments: mappedComments,
      pagination: {
        messagePage,
        postPage,
        commentPage,
        itemsPerPage,
      },
    });
  } catch (error) {
    console.error("Error fetching admin panel data:", error);
    res.status(500).send("Internal Server Error");
  }
};

const postDeleteUser = async (req, res, next) => {
  try {
    const { userId, adminPassword } = req.body;

    if (!userId || !adminPassword) {
      return res.status(400).send("User ID and admin password are required.");
    }

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).send("Unauthorized: Incorrect admin password.");
    }

    const userIdInt = parseInt(userId);

    // Manually delete related records
    await prisma.message.deleteMany({ where: { senderId: userIdInt } });
    await prisma.comment.deleteMany({ where: { authorId: userIdInt } });
    await prisma.post.deleteMany({ where: { authorId: userIdInt } });
    await prisma.conversationUser.deleteMany({ where: { userId: userIdInt } });

    // Finally, delete the user
    await prisma.user.delete({
      where: { id: userIdInt },
    });

    res.redirect("/admin/panel");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send("Internal Server Error");
  }
};

const postCreate = async (req, res, next) => {
  const createType = req.body.create_type;
  const userId = parseInt(req.body.userId);
  if (!createType && !userId) {
    return res.status(400).send("Type of data to be created is required.");
  }
  switch (createType) {
    case "post":
      // render create.ejs
      res.render("create", {
        userId,
        createType,
      });
      break;
    case "comment":
      // grab five latest posts, with all comments to each
      const posts = await prisma.post.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          comments: {
            include: {
              author: {
                select: {
                  username: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          author: {
            select: {
              username: true,
              id: true,
            },
          },
        },
      });
      // attach them and render create.ejs
      res.render("create", {
        userId,
        createType,
        context: posts,
      });
      break;
    case "message":
      // grab three latest chats, with five last messages in each
      const conversationUsers = await prisma.conversationUser.findMany({
        where: {
          userId: userId,
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
            take: 5,
            include: {
              sender: true,
            },
            orderBy: {
              createdAt: "asc", // Order messages by createdAt in ascending order
            },
          },
        },
      });
      // attach them and render create.ejs
      res.render("create", {
        userId,
        createType,
        content: conversations,
      });
      break;
  }
};

module.exports = { getLoginPage, postAdminPanel, postDeleteUser, postCreate };
