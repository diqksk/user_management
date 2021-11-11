const express = require("express");
const app = express();
const web = require("./config/oauth.json").web;
const models = require("./models");
const auth = require("./router/authRouter");
const userRouter = require("./router/userRouter");
const scheduler = require("./utils/scheduler");
const cors = require("cors");

//Release cors
app.use(cors({ origin: "localhost:3000", credentials: true }));

//Use sequelize
models.sequelize.sync();

//Make user acount no active state
scheduler();

//Use body-parser
app.use(express.json());

//Use router
app.use("/api/v1/user", userRouter);
app.use("/api/v1/auth", auth);

//Button for google login
app.get("/", async (req, res) => {
  res.send(
    `<a href='https://accounts.google.com/o/oauth2/auth?client_id=${web.client_id}&redirect_uri=${web.redirect_uris}&scope=https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/userinfo.email&response_type=code'>google 로그인</a>`
  );
});

app.listen(3030, () => {
  console.log("listening on 3030");
});
