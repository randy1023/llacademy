import dotenv from "dotenv";

import express from "express";
import morgan from "morgan";
import { engine } from "express-handlebars";
import indexroutes from "./routes/indexroutes.js";

import linkroutes from "./routes/links.js";
import path from "path";
import session from "express-session";
import passport from "passport";
// initialization

dotenv.config();
const app = express();
const dirname = process.cwd();
import "./lib/passport.js";

//settings

app.set("port", process.env.PORT || 3000);
app.set("views", path.join(dirname, "src/views"));
app.engine(
  ".hbs",
  engine({
    defaultLayout: "main",
    layoutDir: path.join(app.get("views"), "layouts"),
    partialsDir: path.join(app.get("views"), "partials"),
    extname: ".hbs",
    helpers: "./lib/handlebars.js",
  })
);

app.set("view engine", ".hbs");
//middleware
app.use(
  session({
    secret: "llacademy",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// global variables

app.use((req, res, next) => {
  app.locals.user = req.user;

  next();
});
//Routes
app.use(indexroutes);

app.use("/links", linkroutes);

//public
app.use(express.static(path.join(dirname, "src/public")));
//starting de server

app.listen(app.get("port"), () => {
  console.log(`server on port ${3000}`);
});
