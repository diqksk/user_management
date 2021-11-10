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
  const endPage = totalPage > 10 ? Math.ceil(page / 10) + 9 : totalPage;
  const startPage = endPage > 10 ? Math.floor(endPage / 10) * 10 + 1 : 1;
  const nextPage = endPage < totalPage ? true : false;
  const prevPage = page > 10 ? true : false;
  const pageCount = endPage < 11 ? endPage : endPage - startPage;
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
    console.log(whereOptions);
    const count = await User.count({
      where: whereOptions,
    });

    const totalPage = Math.ceil(count / 20);
    if (page > totalPage) page = 1;

    const rows = await User.findAll({
      attributes: [
        "user_email",
        "user_name",
        "user_social",
        "user_logindate",
        "user_role",
        "createdAt",
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

    if (!created) return { err: "이미 존재하는 회원입니다.", code: "409" };

    return { msg: "회원가입 완료!", code: "200" };
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
   * Logout
   * @param {*} user_id
   */
  async logOut(user_id) {
    client.get(user_id, (err, result) => {
      if (err) throw new Error("로그아웃 할 수 없습니다", err);
      client.del(user_id);
    });
  },
};
