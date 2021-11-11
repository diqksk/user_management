const express = require("express");
const router = express.Router();
const userService = require("../service/userService");
const authenticate = require("../utils/authenticate");

/**
 * Form validation
 * @param {Object} inputs {user_email, user_password, user_name}
 * @returns {Object} {msg,code}  or  {err,code}
 */
const isValid = (inputs) => {
  const regExp =
    /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;

  if (!inputs.user_email) return { err: "Email is empty", code: 400 };
  else if (!regExp.test(inputs.user_email))
    return { err: "Email format is not valid", code: 400 };

  if (!inputs.user_password) return { err: "Password is empty", code: 400 };
  else if (inputs.user_password.length < 8)
    return { err: "Password is too short (min 8 words)", code: 400 };

  if (!inputs.user_name) return { err: "Name is empty", code: 400 };
  else if (inputs.user_name.length < 2)
    return { err: "Name is too short (min 2 words)", code: 400 };

  return { msg: "valid", code: 200 };
};

/**
 * Get user list
 */
router.get("/", authenticate.user, async (req, res) => {
  const user_email = req.query.user_email;
  let page = req.query.page;

  if (!page || page < 1) page = 1;

  if (isNaN(page))
    return res.status(400).send({ err: "page is number.", code: 400 });

  const result = await userService.getUserList(page, user_email);

  return res.status(result.code).send(result);
});

/**
 * Sign up
 */
router.post("/", async (req, res) => {
  const userForm = req.body;

  const validData = isValid(userForm);

  if (validData.code !== 200) {
    return res.status(validData.code).send(validData);
  }

  const result = await userService.signUp({ ...userForm });

  return res.status(result.code).send(result);
});

/**
 * Get User Detail
 */
router.get("/detail", authenticate.userSelf, async (req, res) => {
  const { user_id } = req.query;

  if (!user_id || isNaN(user_id))
    return res.status(400).send({ err: "invalid request", code: 400 });

  const result = await userService.getUserDetail(user_id);
  return res.status(result.code).send(result);
});

/**
 * Update account
 */
router.put("/", authenticate.userSelf, async (req, res) => {
  const userForm = req.body;

  const validData = isValid(userForm);

  if (validData.code !== 200) {
    return res.status(validData.code).send(validData);
  }

  const { user_id, user_name, user_password } = userForm;
  const newForm = { user_id, user_name, user_password };

  for (let obj in newForm) {
    if (!newForm[obj]) delete newForm[obj];
  }

  const result = await userService.updateUser({ ...newForm });

  return res.status(result.code).send(result);
});

/**
 * Toggle user stopped status
 */
router.put("/stop", authenticate.admin, async (req, res) => {
  const { body: userForm } = req;

  if (!userForm.user_id)
    return res.status(400).send({ err: "user data is requird", code: 400 });

  if (userForm.user_role === 2)
    return res.status(400).send({ err: "can't stop admin", code: 400 });

  const result = await userService.toggleStopedUser({ ...userForm });

  return res.status(result.code).send(result);
});

/**
 * Release user freeze status
 */
router.put("/release", authenticate.userSelf, async (req, res) => {
  const { body: userForm } = req;

  if (!userForm.user_id)
    return res.status(400).send({ err: "user data is requird" });

  const result = await userService.realeaseSleepingAccount({ ...userForm });

  return res.status(result.code).send(result);
});

/**
 * Exit account
 */
router.delete("/", authenticate.userSelf, async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).send({ err: "user id is requird" });

  const formData = { user_id, user_stopdate: new Date(), user_isdel: true };

  const result = await userService.exitUser({ ...formData });

  return res.status(result.code).send(result);
});

/**
 * Logout
 */
router.delete("/logout", authenticate.userSelf, async (req, res) => {
  const { user_id } = req.body;
  if (!user_id)
    return res.status(400).send({ err: "user id is required", code: 400 });

  const result = await userService.logOut(user_id);

  return res.status(result.code).send(result);
});

module.exports = router;
