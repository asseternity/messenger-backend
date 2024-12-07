// dependencies
require("dotenv").config();
const express = require("express");
const path = require("node:path");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");

// cors
app.use(
  cors({
    origin: "https://asseternity.github.io",
    credentials: true,
  })
);

// settings
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// passport
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

authUser = async (username, password, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: username },
    });
    if (!user) {
      return done(null, false, { message: "Incorrect username" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: "Incorrect password" });
    }

    // User authenticated successfully, now generate a JWT
    const payload = { username: user.username, id: user.id };
    const secret = process.env.JWT_SECRET;
    const options = { expiresIn: "2h" };
    const token = jwt.sign(payload, secret, options);

    return done(null, user, { token });
  } catch (err) {
    return done(err);
  }
};

passport.use(new LocalStrategy(authUser));

app.post("/log-in", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Server error", error: err });
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }

    const token = info.token;

    return res.status(200).json({
      message: "Authentication successful",
      token,
      username: user.username,
      userId: user.id,
    });
  })(req, res, next);
});

// mount
const indexRoute = require("./routes/indexRoute");
app.use("/", indexRoute);

// launch
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
