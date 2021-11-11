const { User } = require("../models");
const token = require("../utils/jwtMaker");
const bcrypt = require("bcrypt");
const redis = require("redis");
const jwtMaker = require("../utils/jwtMaker");
const client = redis.createClient();

module.exports = {
  /**
   * Google social login (OAuth2.0)
   * @param {Object}} {user_email, user_id}
   * @param {String} social
   * @returns {Object} {msg, code} or {err, code}
   */
  async googleLogIn(userInfo, social) {
    const hashedPassword = bcrypt.hashSync(userInfo.user_id, 10);
    const [user, created] = await User.findOrCreate({
      where: { user_email: userInfo.email },
      defaults: {
        user_name: "기본이름",
        user_password: hashedPassword,
        user_social: social,
        user_logindate: new Date(),
      },
    });

    const accessToken = token.generateToken(
      {
        user_id: user.user_id,
        user_email: user.user_email,
        user_name: user.user_namem,
        user_role: user.user_role,
      },
      true
    );
    const refreshToken = token.generateToken({ user_id: user.user_id });

    client.setex(user.user_id, 60 * 60 * 24, refreshToken); //exp time 24hours

    if (created)
      return {
        err: "회원가입 완료. 추가정보를 기입해주세요",
        code: 301,
        accessToken,
        refreshToken,
        user_id: user.dataValues.user_id,
      };

    const user_logindate = new Date();

    await User.update(
      { user_logindate },
      { where: { user_email: userInfo.email } }
    );

    if (user.dataValues.user_isnotactive)
      return {
        err: "please release no active condition",
        code: 302,
        accessToken,
        refreshToken,
        user_id: user.dataValues.user_id,
      };

    return {
      msg: "로그인 성공",
      code: 200,
      accessToken,
      refreshToken,
      user_id: user.dataValues.user_id,
    };
  },

  /**
   * Local login
   * @param {Object} formData {user_email, user_password}
   * @returns {Object} {msg, statusCode, accessToken, refreshToken}
   */
  async localLogin(formData) {
    const userInfo = await User.findOne({
      where: { user_email: formData.user_email },
      attributes: [
        "user_id",
        "user_email",
        "user_name",
        "user_role",
        "user_password",
        "user_isnotactive",
      ],
    });

    if (!userInfo) return { err: "User is not exist", code: 403 };

    const isMatchedPassword = bcrypt.compareSync(
      formData.user_password,
      userInfo.user_password
    );

    if (!isMatchedPassword) return { err: "wrong password", code: 403 };

    const accessToken = jwtMaker.generateToken(
      { ...userInfo.dataValues },
      true
    );
    const refreshToken = jwtMaker.generateToken({ ...userInfo.dataValues });

    if (userInfo.user_isnotactive)
      return {
        err: "please release no active condition",
        code: 302,
        accessToken,
        refreshToken,
      };

    try {
      client.setex(userInfo.user_id, 60 * 60 * 24, refreshToken); //exp time 24hours
    } catch (e) {
      return { err: "token can't be stored", err: 500 };
    }

    const user_logindate = new Date();

    await User.update(
      { user_logindate },
      { where: { user_email: formData.user_email } }
    );

    return {
      msg: "login success",
      code: 200,
      accessToken,
      refreshToken,
      user_id: userInfo.user_id,
    };
  },
};
