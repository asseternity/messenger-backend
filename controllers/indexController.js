const bcryptjs = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getIndex = async (req, res, next) => {
  res.render("passport_test", { user: req.user });
};

const getFailure = async (req, res, next) => {
  res.render("passport_failure");
};

const getEmpty = async (req, res, next) => {
  console.log(req.user);
  console.log(req.session);
  res.render("passport_empty");
};

const postSignUp = async (req, res, next) => {
  try {
    if (req.body.password !== req.body.cpassword) {
      return res.status(400).send(`Passwords don't match`);
    }
    bcryptjs.hash(req.body.password, 10, async (err, hashedPassword) => {
      await prisma.user.create({
        data: {
          username: req.body.username,
          password: hashedPassword,
          email: req.body.email,
        },
      });
      res.redirect("/");
    });
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

module.exports = {
  getIndex,
  getFailure,
  getEmpty,
  postSignUp,
};
