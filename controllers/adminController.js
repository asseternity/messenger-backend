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

    // Render the panel.ejs view with users and messages
    res.render("panel", { users, messages: mappedMessages });
  } catch (error) {
    console.error("Error fetching admin panel data:", error);
    res.status(500).send("Internal Server Error");
  }
};

const postDeleteUser = async (req, res, next) => {
  try {
    const { userId, adminPassword } = req.body;

    // Check if required fields are provided
    if (!userId || !adminPassword) {
      return res.status(400).send("User ID and admin password are required.");
    }

    // Verify the admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).send("Unauthorized: Incorrect admin password.");
    }

    // Delete user and all related data
    await prisma.user.delete({
      where: {
        id: parseInt(userId),
      },
    });

    // Redirect back to the admin panel
    res.redirect("/admin/panel");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { getAdminPanel, postDeleteUser };
