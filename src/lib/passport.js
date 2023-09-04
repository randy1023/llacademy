/* import passport from "passport";
import { Strategy } from "passport-local";
import { promispool } from "../db.js";
import helpers from "./helpers.js";



passport.use(
  "local.signup",
  new Strategy(
    {
      usernameField: "username",
      passwordField: "passwords",
      passReqToCallback: true,
    },
    async (req, username, passwords, done) => {
      const { full_name, rol} = req.body;
      const newUser = {
        username,
        passwords,
        full_name,
        rol,
      };
      newUser.passwords = await helpers.encryptPassword(passwords);

      const [results] =
        await promispool.query(`INSERT INTO users (username, passwords, rol,full_name ) VALUES
      ('${newUser.username}', '${newUser.passwords}', '${newUser.rol}', '${newUser.full_name}');`);

      newUser.id = results.insertId;

      
      return done(null, newUser);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const [results] = await promispool.query(
    `SELECT * FROM users WHERE user_id = '${id}'`
  );

  done(null, results[0]);
}); */
