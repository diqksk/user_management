const jwt = require("./jwtMaker");
const redis = require("redis");
const client = redis.createClient();
const { User } = require("../models");

/**
 * Get refresh token in redis
 * @param {Number} user_id User id
 * @returns {String} Refresh token
 */
const getRefreshToken = (user_id) => {
  return new Promise((resolve, reject) => {
    client.get(user_id, (err, reply) => {
      if (err) return reject("토큰 오류");
      return resolve(reply);
    });
  });
};

/**
 * Middle ware of authorization & authentication
 * @param {Number} accessibleRole Required role
 * @param {Boolean} isOnlyOwn Self auth check
 * @returns {Object} {err,code} or next();
 */
const auth = (accessibleRole, isOnlyOwn) => {
  return async (req, res, next) => {
    let decodedData;

    //token 존재여부확인
    if (!req.headers.authorization)
      return res.status(403).send({ err: "please login", code: 403 });

    const token = req.headers.authorization.substr(7).trim();

    //토큰의 유효성검증
    try {
      decodedData = jwt.isValidToken(token);
    } catch (e) {
      return res.status(403).send({ err: "invalid token", code: 403 });
    }

    //access, refresh 여부 판별
    if (Object.keys(decodedData).length === 1) {
      //refresh 유효성검토

      let originalRefreshToken;

      try {
        originalRefreshToken = await getRefreshToken(decodedData.user_id);

        // 토큰만료
        if (!originalRefreshToken)
          return res
            .status(401)
            .send({ err: "expired token, please login again", code: 401 });
      } catch (e) {
        //redis에서 토큰 얻어오기 실패
        return res.status(401).send({ err: "internal server err", code: 500 });
      }

      //토큰 불일치
      if (token !== originalRefreshToken) {
        return res.status(401).send({ err: "invalid token", code: 401 });
      }

      //인가된 refresh토큰으로 요청시 새로운 access token 발급.
      const { dataValues } = await User.findOne({
        where: { user_id: decodedData.user_id },
      });

      const accessToken = jwt.generateToken(dataValues, true);

      return res
        .status(200)
        .send({ msg: "issue new access token.", code: 200, accessToken });
    }

    //access token이면 권한검사
    console.log("accessToken");

    //소셜로그인 추가정보 미기입시 추가정보 기입 페이지로 이동
    if (decodedData.user_name === "기본이름")
      return res
        .status(302)
        .send({ err: "please insert additional information", code: 302 });

    //휴면계정으로 접근시 휴면계정 해제 페이지로 이동
    if (decodedData.user_isnotactive) {
      return res.send(302).status({
        err: "please release no active condition",
        code: 302,
      });
    }

    //유저의 권한이 가능권한보다 낮거나 정지회원시 금지
    if (decodedData.user_role < accessibleRole || decodedData.user_role === 1)
      return res.status(403).send({ err: "no permisson", code: 403 });

    //접근자가 자신인지 판별
    if (isOnlyOwn) {
      if (
        !(
          decodedData.user_id === req.body.user_id ||
          decodedData.user_role === 2
        )
      )
        return res.status(403).send({ err: "no permisson", code: 403 });
    }

    return next();
  };
};

/**
 * user: Can enter normal and admin
 * admin: Can enter only admin
 * userSelf: Can enter userSelf and admin too
 */
module.exports = { user: auth(0), admin: auth(2), userSelf: auth(0, true) };
