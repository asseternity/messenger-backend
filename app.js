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
    origin: ["https://asseternity.github.io", "http://localhost:5173"],
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
    console.log("Authenticating user:", username);
    const user = await prisma.user.findUnique({
      where: { username: username },
    });
    console.log("User found:", user);
    if (!user) {
      return done(null, false, { message: "Incorrect username" });
    }
    // Special case for guest user login: Skip password check
    if (username === "Guest") {
      console.log("Guest user logging in...");
      const payload = { username: user.username, id: user.id };
      const secret = process.env.JWT_SECRET;
      const options = { expiresIn: "2h" };
      const token = jwt.sign(payload, secret, options);
      return done(null, user, { token });
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
      id: user.id,
      profilePicture: user.profilePicture,
      bio: user.bio,
      following: user.following,
    });
  })(req, res, next);
});

// Auto-login
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: jwtPayload.id },
        });
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        if (user.username === "Guest") {
          return done(null, false, {
            message: "Not available for guest login",
          });
        }
        return done(null, user); // User is authenticated
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

app.post(
  "/auto-login",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const user = req.user; // User is now authenticated and attached to the request object
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a new token for the user
    const newToken = jwt.sign(
      { username: user.username, id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Auto-login successful",
      token: newToken,
      username: user.username,
      userId: user.id,
      id: user.id,
      profilePicture: user.profilePicture,
      bio: user.bio,
      following: user.following,
    });
  }
);

// mount
const indexRoute = require("./routes/indexRoute");
const uploadRoute = require("./routes/uploadRoute");
const adminRoute = require("./routes/adminRoute");

app.use("/", indexRoute);
app.use("/upload", uploadRoute);
app.use("/admin", adminRoute);

// launch
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
