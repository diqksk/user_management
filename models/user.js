"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      user_email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_social: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_logindate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      user_stopdate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      user_role: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0, //0: normal 1: stoped 2: admin
      },
      user_isdel: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: false,
      },
      user_isnotactive: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "User",
      timestamps: true,
      createdAt: true,
      updatedAt: false,
    }
  );
  return User;
};
