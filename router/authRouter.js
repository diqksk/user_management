const express = require("express");
const router = express.Router();
const axios = require("axios");
const web = require("../config/oauth.json").web;
const { googleLogIn } = require("../service/authService");
const authService = require("../service/authService");

/**
 * Local login(Token based)
 */
router.post("/login", async (req, res) => {
  const userForm = req.body;

  if (!userForm.user_email)
    return res.status(400).send({ err: "Email is empty", code: 400 });
  if (!userForm.user_password)
    return res.status(400).send({ err: "Password is empty", code: 400 });

  const loginResult = await authService.localLogin(userForm);

  return res.status(loginResult.code).send(loginResult);
});

/**
 * Google Login (OAuth2.0, Token Based)
 */
router.get("/google/login", async (req, res) => {
  const { data } = await axios.post(
    "https://www.googleapis.com/oauth2/v4/token",
    {
      grant_type: "authorization_code",
      code: req.query.code,
      client_id: web.client_id,
      client_secret: web.client_secret,
      redirect_uri: web.redirect_uris[0],
    }
  );

  const { data: userInfo } = await axios.post(
    "https://www.googleapis.com/oauth2/v1/tokeninfo",
    {
      access_token: data.access_token,
      scope:
        "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    }
  );

  const loginResult = await googleLogIn({ ...userInfo }, "google");
  return res.status(loginResult.code).send(loginResult); //TODO: 회원가입로직에서는 이름수정, 이미가입된유저면 토큰발행
});

module.exports = router;
