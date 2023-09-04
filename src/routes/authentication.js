import helpers from "../lib/helpers.js";
import jsonwebtoken from "jsonwebtoken";
const checkAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await helpers.verifyToken(token);

    console.log(tokenData.id);
    if (tokenData.id) {
      next();
    } else {
      return res.status(401).send("Invalid token");
    }
  } catch (error) {}
};

/* const checkAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ").pop();
    if (!token) {
      return res.status(401).send("No existen el token");
    }
    console.log(tokenData);
    if (tokenData.id) {
      req.headers["Authorization"] = tokenData;
      next();
    } else {
      return res.status(401).send("Invalid token");
    } 
    const tokenData = await helpers.verifyToken(token);

    req.user = tokenData.user_id;
    next();
  } catch (error) {}
}; */

export default checkAuth;
