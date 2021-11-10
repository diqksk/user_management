const jwt = require("jsonwebtoken");
const { secretKey } = require("../config/jwt.json");

module.exports = {
  /**
   * Get JWT token
   * @param {Object} userInfo {user_id, user_email, user_name, user_role}
   * @param {Boolean} typeOfToken  select token type (true: access, false: refresh);
   * @returns {String} Token (access or refresh);
   */
  generateToken(userInfo, typeOfToken) {
    const ACCESS_EXP = Math.floor(Date.now() / 1000) + 60 * 60; // 1hour
    const REFRESH_EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24hours
    let payload = { user_id: userInfo.user_id };

    if (typeOfToken)
      payload = {
        user_id: userInfo.user_id,
        user_email: userInfo.user_email,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
      };

    const token = jwt.sign(
      { exp: typeOfToken ? ACCESS_EXP : REFRESH_EXP, data: payload },
      secretKey,
      { algorithm: "HS256" }
    );
    return token;
  },

  /**
   * Token validation check
   * @param {String} token Token kind of refresh or access
   * @returns {Object} Decoded data
   */
  isValidToken(token) {
    let decodedData;

    decodedData = jwt.verify(token, secretKey).data;

    return decodedData;
  },
};
