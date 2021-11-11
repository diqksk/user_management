const { User, sequelize } = require("../models");
const { Op } = require("sequelize");
const redis = require("redis");
const client = redis.createClient();
const bcrypt = require("bcrypt");

/**
 * Make pager Object
 * @param {Number} totalPage
 * @param {Number} page Now page
 * @param {String} searchValue User search value (email)
 * @returns {Object} {totalPage, endPage, startPage, nextPage, prevPage, pageList, page, searchValue}
 */
const carculatePage = (totalPage, page, searchValue = "") => {
  if (page > totalPage) page = 1;
  const fakeEndPage = totalPage > 10 ? Math.ceil(page / 10) * 10 : totalPage;
  const endPage = fakeEndPage > totalPage ? totalPage : fakeEndPage;
  const startPage = endPage > 10 ? Math.floor(endPage / 10) * 10 + 1 : 1;
  const nextPage = endPage < totalPage ? true : false;
  const prevPage = page > 10 ? true : false;
  const pageCount =
    endPage < 11 ? endPage : endPage - startPage ? endPage - startPage + 1 : 1;

  const pageList = new Array(pageCount)
    .fill(startPage)
    .map((pageNum, idx) => pageNum + idx);

  return {
    totalPage,
    endPage,
    startPage,
    nextPage,
    prevPage,
    pageList,
    page,
    searchValue,
  };
};
/**
 * Delete user data in redis
 * @param {String} user_id
 * @returns {Object} {msg,code} or {err,code}
 */
const deleteLoginData = (user_id) => {
  return new Promise((resolve, reject) => {
    client.get(user_id, (err, result) => {
      if (err) return reject({ err: "can't logout", code: 500 });
      if (!result) return resolve({ err: "user is not login", code: 500 });
      client.del(user_id);
      return resolve({ msg: "logout success", code: 200 });
    });
  });
};

module.exports = {
  /**
   * Get user list with search option
   * @param {Number} page
   * @param {String} user_email
   * @returns {Object} {msg, code, data}
   */
  async getUserList(page = 1, user_email) {
    const whereOptions = {
      user_isdel: {
        [Op.eq]: false,
      },
      user_isnotactive: {
        [Op.eq]: false,
      },
    };

    if (user_email) whereOptions["user_email"] = { [Op.substring]: user_email };
    const count = await User.count({
      where: whereOptions,
    });

    const totalPage = Math.ceil(count / 20);
    if (page > totalPage) page = 1;

    const rows = await User.findAll({
      attributes: [
        "user_id",
        "user_email",
        "user_name",
        "user_social",
        "user_logindate",
        "user_role",
        "createdAt",
        "user_stopdate",
      ],
      where: whereOptions,
      offset: Number((page - 1) * 20),
      limit: 20,
      order: [["user_id", "DESC"]],
    });

    return {
      msg: "success",
      code: 200,
      data: {
        userList: rows,
        pagenation: carculatePage(totalPage, page, user_email),
      },
    };
  },

  /**
   * Get user detail
   * @param {String} user_id
   * @returns {Object} {msg, code, data} or {err, code}
   */
  async getUserDetail(user_id) {
    const userInfo = await User.findOne({
      where: { user_id },
    });

    if (!userInfo) return { err: "User is not exist", code: 403 };

    const { dataValues } = userInfo;

    return { msg: "success", code: 200, data: dataValues };
  },

  /**
   * Sign up
   * @param {Object} userForm {user_email, user_password, user_name}
   * @returns {Object} {msg, code} or {err, code}
   */
  async signUp(userForm) {
    const hashedPassword = bcrypt.hashSync(userForm.user_password, 10);

    const [user, created] = await User.findOrCreate({
      where: { user_email: userForm.user_email },
      defaults: {
        user_email: userForm.user_email,
        user_password: hashedPassword,
        user_name: userForm.user_name,
        user_social: "local",
      },
    });

    if (!created) return { err: "Already exist email", code: "409" };

    return { msg: "Sign up success", code: "200" };
  },

  /**
   * Update user information
   * @param {*} formData {user_id, [user_name, user_password]}
   * @returns
   */
  async updateUser(formData) {
    const hashedPassword = bcrypt.hashSync(formData.user_password, 10);
    const result = await User.update(
      { ...formData, user_password: hashedPassword },
      {
        where: { user_id: formData.user_id },
      }
    );

    if (!result[0]) return { err: "update failed", code: 500 };

    return { msg: "update success", code: 200 };
  },

  /**
   * Toggle stopped user status
   * @param {Object} formData {user_id, user_stopdate}
   * @returns {Object} {msg,code,data} or {err, code}
   */
  async toggleStopedUser(formData) {
    const result = await User.update(
      {
        user_stopdate: formData.user_stopdate ? null : new Date(),
        user_role: formData.user_role ? 0 : 1,
      },
      {
        where: { user_id: formData.user_id },
      }
    );

    if (!result[0]) return { err: "can't change stop status", code: 500 };

    const userInfo = await User.findOne({
      where: { user_id: formData.user_id },
    });

    const { dataValues } = userInfo;

    return { msg: "changed success", code: 200, data: dataValues };
  },

  /**
   * Realease sleeping account
   * @param {Object} formData {user_id, user_stopdate}
   * @returns {Object} {msg,code} or {err, code}
   */
  async realeaseSleepingAccount(formData) {
    const result = await User.update(
      {
        user_isnotactive: 0,
      },
      {
        where: { user_id: formData.user_id },
      }
    );

    if (!result[0]) return { err: "can't release account", code: 500 };

    return { msg: "changed success", code: 200 };
  },

  /**
   * Exit user
   * @param {String} user_id
   * @returns {Object} {msg, code} or {err, code}
   */
  async exitUser(formData) {
    const result = await User.update(formData, { where: user_id });
    if (!result[0]) return { err: "can't exit", code: 500 };

    return { msg: "exit done", code: 200 };
  },

  /**
   * Logout
   * @param {*} user_id
   */
  async logOut(user_id) {
    const result = await deleteLoginData(user_id);
    return result;
  },
};
