const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAdminPanel = async (req, res, next) => {
  try {
    // Fetch all users sorted by creation date (latest first)
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch all messages sorted by date (latest first)
    const messages = await prisma.message.findMany({
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

    // Fetch latest posts sorted by date (latest first)
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: true,
      },
    });

    // Fetch latest comments sorted by date (latest first)
    const comments = await prisma.comment.findMany({
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

    // Render the panel.ejs view with users, messages, posts, and comments
    res.render("panel", {
      users,
      messages: mappedMessages,
      posts,
      comments: mappedComments,
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

module.exports = { getAdminPanel, postDeleteUser };
