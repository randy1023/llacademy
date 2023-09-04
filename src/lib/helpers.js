import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";

const helpers = {};

helpers.encryptPassword = async (passwords) => {
  const salt = await bcrypt.genSalt(10);

  const finalPassword = await bcrypt.hash(passwords, salt);
  return finalPassword;
};

helpers.matchPassword = async (passwords, savePassword) => {
  try {
    await bcrypt.compare(passwords, savePassword);
  } catch (e) {
    console.log(e);
  }
};

helpers.tokenSign = async (user) => {
  return jsonwebtoken.sign(
    { id: user.user_id, role: user.rol },
    process.env.JWT_SECRET,
    {
      expiresIn: 60 * 60 * 24,
    }
  );
};

helpers.verifyToken = async (token) => {
  try {
    return jsonwebtoken.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default helpers;
