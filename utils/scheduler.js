const cron = require("node-cron");
const { User } = require("../models");
const { Op } = require("sequelize");

/**
 * Make no active account
 * 스케쥴러를 이용해 매일 오전 3시에 6개월간 접속하지 않은 유저는 휴면계정으로 전환.
 * 서버와 분리해서 단독모듈로 사용할수 있다.
 */
module.exports = () => {
  cron.schedule("0 3 1-31 * *", () => {
    const now = new Date();

    User.update(
      { user_isnotactive: true },
      {
        where: {
          user_logindate: {
            [Op.lt]: new Date(now.setMonth(now.getMonth() - 6)),
          },
        },
      }
    );
    console.log(new Date());
  });
};
