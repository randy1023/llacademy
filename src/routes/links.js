import { Router } from "express";
import passport from "passport";
import PDFDocument from "pdfkit-table";
import { promispool } from "../db.js";
import bcrypt from "bcrypt";
import helpers from "../lib/helpers.js";
import checkAuth from "./authentication.js";

const routes = Router();
const doc = new PDFDocument({ bufferPages: true });

routes.get("/signup", checkAuth, (req, res) => {
  res.render("links/signup");
});

routes.post(
  "/signup",
  checkAuth,
  async (req, res) => {
    const { full_name, rol, username, passwords } = req.body;

    const newUser = {
      username,
      passwords,
      full_name,
      rol,
    };
    newUser.passwords = await helpers.encryptPassword(passwords);

    await promispool.query(`INSERT INTO users (username, passwords, rol,full_name ) VALUES
  ('${newUser.username}', '${newUser.passwords}', '${newUser.rol}', '${newUser.full_name}');`);

    res.redirect("/links/login");
  }
  /*  passport.authenticate("local.signup", {
    successRedirect: "login",
    failureRedirect: "signup",
  }) */
);

routes.get("/login", (req, res) => {
  res.render("links/login");
});

routes.post("/login", async (req, res) => {
  const { username, passwords } = req.body;

  const [results] = await promispool.query(
    `SELECT *  FROM users WHERE username = '${username}';`
  );
  console.log(results);
  if (results.length == 0) {
    return res.status(401).send("Invalid username");
  }
  const user = results[0];

  const finallyPassword = await bcrypt.compare(passwords, user.passwords);
  if (!finallyPassword) {
    return res.status(401).send("Invalid password");
  }
  const tokenSession = await helpers.tokenSign(user);
  const role = user.rol;

  req.headers.authorization = tokenSession;
  console.log(tokenSession, req.body);
  console.log(req.headers);

  // Redirect the user to the appropriate path based on their role
  switch (role) {
    case "teacher":
      res.redirect("teacher");
      break;
    case "secretary":
      res.redirect("secretary");
      break;
    case "accountant":
      res.redirect("accountant");
      break;
    case "super_user":
      res.redirect("signup");
      break;
    default:
      res.status(401).send("Invalid credentials");
  }
});

routes.get("/signupsee", (req, res) => {
  res.render("links/signupsee");
});

routes.post("/signupsee", async (req, res) => {
  const { username, full_name } = req.body;
  const [results] = await promispool.query(
    `SELECT * FROM users u WHERE u.full_name ='${full_name}' AND u.username= '${username}';`
  );

  const user = results[0];

  res.render("links/signupsee", {
    result: results[0],
  });
});
routes.get("/signupedit", (req, res) => {
  res.render("links/signupedit");
});

routes.get("/signupedit/:usernames", async (req, res) => {
  const { usernames } = req.params;

  const [results] = await promispool.query(
    `SELECT * FROM users u WHERE u.username= '${usernames}';`
  );

  res.render("links/signupedit", { result: results[0] });
});

routes.post("/signupedit/:usernames", async (req, res) => {
  const { usernames } = req.params;
  const { rol, full_name, username } = req.body;

  await promispool.query(
    `UPDATE users u SET u.full_name = '${full_name}', u.username = '${username}', u.rol ='${rol}' WHERE u.username = '${usernames}';`
  );

  res.redirect("/links/signupsee");
});

routes.get("/secretary", (req, res) => {
  res.render("links/secretary");
});

routes.post("/secretary", async (req, res) => {
  const { code } = req.body;
  const codes = {
    code: code,
  };
  try {
    const [results] =
      await promispool.query(`SELECT s.code , s.first_name ,s.last_name,s.identity_card,DATE_FORMAT(s.date_time, '%Y-%m-%d') AS date_time,s.phone ,s.mail ,s.address,c.name_course ,
   s2.day_1 ,s2.shift ,s2.time_entry, s2.time_departure,
   s3.day_2 ,s3.shift_2 , s3.time_entry_2 ,s3.time_departure_2, s.statu FROM student s
    INNER JOIN courses c ON s.course_id  = c.course_id 
    INNER JOIN schedueles_1 s2 ON s.schedule1_id = s2.schedule1_id 
    INNER JOIN schedueles_2 s3 ON s.schedule2_id = s3.schedule2_id 
   GROUP BY s.code
   HAVING s.code = '${codes.code}'`);

    /* console.log(results); */
    res.render("links/secretary", { results: results });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .send("INTENTASTE INGRESAR UN CODIGO DE ESTUDIANTE EXISTENTE");
    } else if (error.code == "ECONNREFUSED") {
      res.status(400).send("EL SERVIDOR NO SE ESTA EJECUTANDO");
    } else if (error.code === "ETIMEDOUT") {
      res.status(400).send("EL SERVIDOR TARDA EN RESPONDER");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      res
        .status(400)
        .send("NO TIENE LOS PERMISOS NECESARIOS PARA LA BASE DE DATO ");
    } else if (error.code === "ER_PARSE_ERROR") {
      res.status(400).send("ERROR DE SINTAXIS(SQL) ");
    } else if (error.code === "ER_DATA_TOO_LONG") {
      res.status(400).send("DATOS MUY LARGOS ");
    } else if (error.code === "CR_SERVER_LOST") {
      res.status(400).send("PERDIO LA CONEXION ");
    } else {
      throw error;
    }
  }
});

routes.get("/inscription", (req, res) => {
  res.render("links/inscription");
});

routes.post("/inscription", async (req, res) => {
  const {
    code,
    first_name,
    last_name,
    identity_card,
    date_time,
    phone,
    mail,
    address,
    name_course,
    day_1,
    shift,
    time_entry,
    time_departure,
    day_2,
    shift_2,
    time_entry_2,
    time_departure_2,
    statu,
    secretary,
  } = req.body;

  const inscr = {
    code,
    first_name,
    last_name,
    identity_card,
    date_time,
    phone,
    mail,
    address,
    name_course,
    day_1,
    shift,
    time_entry,
    time_departure,
    day_2,
    shift_2,
    time_entry_2,
    time_departure_2,
    statu,
    secretary,
  };

  try {
    await promispool.query(`INSERT INTO student(code,first_name,last_name,date_time,phone,mail,address,identity_card,course_id,schedule1_id,schedule2_id,statu,user_id)
  VALUES
      ('${inscr.code}','${inscr.first_name}','${inscr.last_name}','${inscr.date_time}','${inscr.phone}','${inscr.mail}','${inscr.address}','${inscr.identity_card}',
       (SELECT course_id FROM courses WHERE courses.name_course  = '${inscr.name_course}'),
       (SELECT schedule1_id  FROM schedueles_1 WHERE day_1 = '${inscr.day_1}' AND shift = '${inscr.shift}' AND time_entry = '${inscr.time_entry}' AND time_departure = '${inscr.time_departure}'),
       (SELECT schedule2_id FROM schedueles_2 WHERE day_2 = '${inscr.day_2}' AND shift_2 = '${inscr.shift_2}' AND time_entry_2 = '${inscr.time_entry_2}' AND time_departure_2 = '${inscr.time_departure_2}'),'${inscr.statu}',
       (SELECT user_id FROM users WHERE rol = '${inscr.secretary}'));
      `);

    res.redirect("secretary");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .send("INTENTASTE INGRESAR UN CODIGO DE ESTUDIANTE EXISTENTE");
    } else if (error.code == "ECONNREFUSED") {
      res.status(400).send("EL SERVIDOR NO SE ESTA EJECUTANDO");
    } else if (error.code === "ETIMEDOUT") {
      res.status(400).send("EL SERVIDOR TARDA EN RESPONDER");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      res
        .status(400)
        .send("NO TIENE LOS PERMISOS NECESARIOS PARA LA BASE DE DATO ");
    } else if (error.code === "ER_PARSE_ERROR") {
      res.status(400).send("ERROR DE SINTAXIS(SQL) ");
    } else if (error.code === "ER_DATA_TOO_LONG") {
      res.status(400).send("DATOS MUY LARGOS ");
    } else if (error.code === "CR_SERVER_LOST") {
      res.status(400).send("PERDIO LA CONEXION ");
    } else {
      throw error;
    }
  }
});

routes.get("/updatestudent/:code", async (req, res) => {
  const { code } = req.params;
  const codes = {
    code: code,
  };

  try {
    const [results] =
      await promispool.query(`SELECT s.code , s.first_name ,s.last_name,s.identity_card,DATE_FORMAT(s.date_time, '%Y-%m-%d') AS date_time,s.phone ,s.mail ,s.address,c.name_course ,
   s2.day_1 ,s2.shift ,s2.time_entry, s2.time_departure,
   s3.day_2 ,s3.shift_2 , s3.time_entry_2 ,s3.time_departure_2, s.statu FROM student s
    INNER JOIN courses c ON s.course_id  = c.course_id 
    INNER JOIN schedueles_1 s2 ON s.schedule1_id = s2.schedule1_id 
    INNER JOIN schedueles_2 s3 ON s.schedule2_id = s3.schedule2_id 
   GROUP BY s.code
   HAVING s.code = '${codes.code}'`);

    console.log(results[0]);

    res.render("links/updatestudent", { result: results[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .send("INTENTASTE INGRESAR UN CODIGO DE ESTUDIANTE EXISTENTE");
    } else if (error.code == "ECONNREFUSED") {
      res.status(400).send("EL SERVIDOR NO SE ESTA EJECUTANDO");
    } else if (error.code === "ETIMEDOUT") {
      res.status(400).send("EL SERVIDOR TARDA EN RESPONDER");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      res
        .status(400)
        .send("NO TIENE LOS PERMISOS NECESARIOS PARA LA BASE DE DATO ");
    } else if (error.code === "ER_PARSE_ERROR") {
      res.status(400).send("ERROR DE SINTAXIS(SQL) ");
    } else if (error.code === "ER_DATA_TOO_LONG") {
      res.status(400).send("DATOS MUY LARGOS ");
    } else if (error.code === "CR_SERVER_LOST") {
      res.status(400).send("PERDIO LA CONEXION ");
    } else {
      throw error;
    }
  }
});

routes.post("/updatestudent/:code", async (req, res) => {
  const { code } = req.params;
  const {
    first_name,
    last_name,
    identity_card,
    date_time,
    phone,
    mail,
    address,
    name_course,
    day_1,
    shift,
    time_entry,
    time_departure,
    day_2,
    shift_2,
    time_entry_2,
    time_departure_2,
    statu,
  } = req.body;

  const i = {
    first_name,
    last_name,
    identity_card,
    date_time,
    phone,
    mail,
    address,
    name_course,
    day_1,
    shift,
    time_entry,
    time_departure,
    day_2,
    shift_2,
    time_entry_2,
    time_departure_2,
    statu,
  };

  await promispool.query(`UPDATE student s
  INNER JOIN courses c ON c.course_id  = s.course_id 
  INNER JOIN schedueles_1 s1 ON s1.schedule1_id = s.schedule1_id 
  INNER JOIN schedueles_2 s2 ON s2.schedule2_id = s.schedule2_id 
  SET s.first_name = '${i.first_name}',
  s.last_name  = '${i.last_name}',
  s.identity_card ='${i.identity_card}',
  s.date_time = '${i.date_time}',
  s.phone = '${i.phone}',
  s.mail ='${i.mail}',
  s.address = '${i.address}',
  c.name_course = '${i.name_course}',
  s1.day_1 ='${i.day_1}',
  s1.shift = '${i.shift}',
  s1.time_entry = '${i.time_entry}',
  s1.time_departure ='${i.time_departure}',
  s2.day_2  ='${i.day_2}',
  s2.shift_2 = '${i.shift_2}',
  s2.time_entry_2= '${i.time_entry_2}',
  s2.time_departure_2 ='${i.time_departure_2}',
  s.statu ='${i.statu}'
  WHERE s.code = '${code}';`);

  res.redirect("/links/secretary");
});

routes.get("/teacher", (req, res) => {
  res.render("links/teacher");
});

routes.post("/teacher", async (req, res) => {
  const { code, task_status, task, description_task } = req.body;
  const codes = {
    code,
    task_status,
    task,
    description_task,
  };

  try {
    const [results] =
      await promispool.query(`SELECT s.code,s.first_name,s.last_name,c.name_course ,
    cn.task ,cn.lesson,cn.teacher_name  ,cn.note ,DATE_FORMAT(cn.date_note,'%Y-%m-%d') AS date_note ,cn.task_status ,cn.description_task FROM Control_notes cn 
     INNER JOIN student s  ON cn.student_id = s.student_id 
     INNER JOIN courses c  ON s.course_id = c.course_id 
    GROUP BY s.code,cn.task ,cn.lesson ,cn.note ,cn.teacher_name ,cn.date_note ,cn.task_status ,cn.description_task
    HAVING s.code = '${codes.code}' AND cn.task_status = '${codes.task_status}' AND  cn.task= '${codes.task}' AND cn.description_task = '${codes.description_task}';`);
    console.log(results);
    res.render("links/teacher", { results });
  } catch (error) {}
});

routes.get("/enternotes", (req, res) => {
  res.render("links/enternotes");
});

routes.post("/enternotes", async (req, res) => {
  const {
    date_note,
    teacher_name,
    lesson,
    note,
    task,
    task_status,
    description_task,
    code,
  } = req.body;

  const i = {
    date_note,
    teacher_name,
    lesson,
    note,
    task,
    task_status,
    description_task,
    code,
  };

  console.log(i);
  try {
    await promispool.query(`INSERT INTO Control_notes(date_note,teacher_name,lesson ,note,task,task_status,description_task,student_id)
  VALUES
    ('${i.date_note}','${i.teacher_name}','${i.lesson}',${i.note},'${i.task}','${i.task_status}','${i.description_task}',
    (SELECT student_id FROM student WHERE code = '${i.code}'));
      `);

    res.redirect("teacher");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .send("INTENTASTE INGRESAR UN CODIGO DE ESTUDIANTE EXISTENTE");
    } else if (error.code == "ECONNREFUSED") {
      res.status(400).send("EL SERVIDOR NO SE ESTA EJECUTANDO");
    } else if (error.code === "ETIMEDOUT") {
      res.status(400).send("EL SERVIDOR TARDA EN RESPONDER");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      res
        .status(400)
        .send("NO TIENE LOS PERMISOS NECESARIOS PARA LA BASE DE DATO ");
    } else if (error.code === "ER_PARSE_ERROR") {
      res.status(400).send("ERROR DE SINTAXIS(SQL) ");
    } else if (error.code === "ER_DATA_TOO_LONG") {
      res.status(400).send("DATOS MUY LARGOS ");
    } else if (error.code === "CR_SERVER_LOST") {
      res.status(400).send("PERDIO LA CONEXION ");
    } else {
      throw error;
    }
  }
});

routes.get("/updatenote/:code", async (req, res) => {
  const { code } = req.params;
  const codes = {
    code,
  };
  try {
    const [results] =
      await promispool.query(`SELECT s.code,s.first_name,s.last_name,c.name_course ,
    cn.task ,cn.lesson,cn.teacher_name  ,cn.note ,DATE_FORMAT(cn.date_note,'%Y-%m-%d') AS date_note ,cn.task_status ,cn.description_task FROM Control_notes cn 
     INNER JOIN student s  ON cn.student_id = s.student_id 
     INNER JOIN courses c  ON s.course_id = c.course_id 
    GROUP BY s.code,cn.task ,cn.lesson ,cn.note ,cn.teacher_name ,cn.date_note ,cn.task_status ,cn.description_task
    HAVING s.code = '${codes.code}' ;`);
    console.log(results);
    res.render("links/updatenote", { result: results[0] });
  } catch (error) {}
});

routes.post("/updatenote/:code", async (req, res) => {
  const { code } = req.params;
  const codes = {
    code,
  };
  const {
    date_note,
    teacher_name,
    lesson,
    note,
    task,
    task_status,
    description_task,
  } = req.body;
  const i = {
    date_note,
    teacher_name,
    lesson,
    note,
    task,
    task_status,
    description_task,
  };
  await promispool.query(`UPDATE Control_notes cn 
  INNER JOIN student s ON cn.student_id = s.student_id 
  SET cn.date_note= '${i.date_note}',
  cn.teacher_name = '${i.teacher_name}',
  cn.lesson= '${i.lesson}',
  cn.note= '${i.note}',
  cn.task= '${i.task}',
  cn.task_status = '${i.task_status}',
  cn.description_task = '${description_task}'
  WHERE s.code ='${codes.code}';`);

  res.redirect("/links/teacher");
});

routes.get("/pay", async (req, res) => {
  res.render("links/pay");
});

routes.post("/pay", async (req, res) => {
  const {
    date_time_1,
    months,
    amount,
    currency_type,
    description,
    code,
    payment_place,
  } = req.body;
  const i = {
    date_time_1,
    months,
    amount,
    currency_type,
    description,
    code,
    payment_place,
  };

  await promispool.query(`INSERT INTO control_pay (date_time_1,months,amount,currency_type,description,student_id, payment_place)
  VALUES
    ('${i.date_time_1}','${i.months}',${i.amount}, '${i.currency_type}','${i.description}',
    (SELECT student_id  FROM student WHERE code = '${i.code}'),'${i.payment_place}');`);

  res.redirect("secretary");
});

routes.get("/paySecretary", async (req, res) => {
  res.render("links/paySecretary");
});

routes.post("/paySecretary", async (req, res) => {
  const { code, months } = req.body;
  const i = { code, months };
  const [results] =
    await promispool.query(`SELECT s.code, s.first_name, s.last_name, s.identity_card, c.name_course,
    CONCAT( FORMAT(cp.amount, 2)) AS amount, cp.currency_type, cp.months,
    DATE_FORMAT(cp.date_time_1, '%Y-%m-%d' ) AS date_time_1, cp.description
  FROM control_pay cp
    INNER JOIN student s ON cp.student_id = s.student_id
    INNER JOIN courses c ON c.course_id = s.course_id
  GROUP BY s.code, cp.amount, cp.currency_type, cp.months, cp.date_time_1, cp.description
  HAVING s.code = '${i.code}' AND cp.months = '${i.months}';`);

  res.render("links/paySecretary", { results });
});

routes.get("/accountant", (req, res) => {
  res.render("links/accountant");
});

routes.post("/accountant", async (req, res) => {
  const { code, months } = req.body;
  const i = { code, months };
  const [results] =
    await promispool.query(`SELECT s.code, s.first_name, s.last_name, s.identity_card, c.name_course,
    CONCAT( FORMAT(cp.amount, 2)) AS amount, cp.currency_type, cp.months,
    DATE_FORMAT(cp.date_time_1, '%Y-%m-%d' ) AS date_time_1, cp.description , cp.payment_place
  FROM control_pay cp
    INNER JOIN student s ON cp.student_id = s.student_id
    INNER JOIN courses c ON c.course_id = s.course_id
  GROUP BY s.code, cp.amount, cp.currency_type, cp.months, cp.date_time_1, cp.description, cp.payment_place
  HAVING s.code = '${i.code}' AND cp.months = '${i.months}';`);

  res.render("links/accountant", { results });
});

routes.get("/accountanMonth", (req, res) => {
  res.render("links/accountanMonth");
});

routes.post("/accountanMonth", async (req, res) => {
  const { payment_place, months, currency_type } = req.body;
  const i = { payment_place, months, currency_type };
  const [results] =
    await promispool.query(`SELECT s.code, s.first_name, s.last_name, s.identity_card, c.name_course,
    CONCAT( FORMAT(cp.amount, 2)) AS amount, cp.currency_type, cp.months,
    DATE_FORMAT(cp.date_time_1, '%Y-%m-%d' ) AS date_time_1, cp.description , cp.payment_place
  FROM control_pay cp
    INNER JOIN student s ON cp.student_id = s.student_id
    INNER JOIN courses c ON c.course_id = s.course_id
  GROUP BY s.code, cp.amount, cp.currency_type, cp.months, cp.date_time_1, cp.description, cp.payment_place
  HAVING cp.payment_place = '${i.payment_place}' AND cp.months = '${i.months}' AND cp.currency_type = '${i.currency_type}';`);

  res.render("links/accountanMonth", { results });
});

routes.get("/accountantNotes", (req, res) => {
  res.render("links/accountantNotes");
});

routes.post("/accountantNotes", async (req, res) => {
  const { task_status } = req.body;
  const i = {
    task_status,
  };

  try {
    const [results] =
      await promispool.query(`SELECT s.code,s.first_name,s.last_name,c.name_course ,
    cn.task ,cn.lesson,cn.teacher_name  ,cn.note ,DATE_FORMAT(cn.date_note,'%Y-%m-%d') AS date_note ,cn.task_status ,cn.description_task FROM Control_notes cn 
     INNER JOIN student s  ON cn.student_id = s.student_id 
     INNER JOIN courses c  ON s.course_id = c.course_id 
    GROUP BY s.code,cn.task ,cn.lesson ,cn.note ,cn.teacher_name ,cn.date_note ,cn.task_status ,cn.description_task
    HAVING cn.task_status = '${i.task_status}';`);
    console.log(results);
    res.render("links/accountantNotes", { results });
  } catch (error) {}
});

routes.get("/pdfincome/:code/:months", async (req, res) => {
  const { code, months } = req.params;

  const [results] =
    await promispool.query(`SELECT s.code, s.first_name, s.last_name, s.identity_card, c.name_course,
    CONCAT( FORMAT(cp.amount, 2)) AS amount, cp.currency_type, cp.months,
    DATE_FORMAT(cp.date_time_1, '%Y-%m-%d' ) AS date_time_1, cp.description , cp.payment_place
  FROM control_pay cp
    INNER JOIN student s ON cp.student_id = s.student_id
    INNER JOIN courses c ON c.course_id = s.course_id
  GROUP BY s.code, cp.amount, cp.currency_type, cp.months, cp.date_time_1, cp.description, cp.payment_place
  HAVING s.code = '${code}' AND cp.months = '${months}';`);

  const stream = res.writeHead(200, {
    "content-type": "application/pdf",
    "content-disposition": `attachment;filename= facturas.pdf`,
  });

  const table = {
    title: "Informacion de pago",
    subtitle: `L.L.Academy`,
    headers: [
      "codigo",
      "nombre",
      "apellido",
      "cedula",
      "curso",
      "monto",
      "tipo de pago",
      "mes",
      "fecha",
      "descripcion",
      "Sucursal",
    ],

    rows: results.map((result) => [
      `${result.code}`,
      `${result.first_name}`,
      `${result.last_name}`,
      `${result.identity_card}`,
      `${result.name_course}`,
      `${result.amount}`,
      `${result.currency_type}`,
      `${result.months}`,
      `${result.date_time_1}`,
      `${result.description}`,
      `${result.payment_place}`,
    ]),
  };
  // A4 595.28 x 841.89 (portrait) (about width sizes)
  // width
  await doc.table(table, {
    width: 510,
    x: -1,
  });
  doc.on("data", (data) => {
    stream.write(data);
  });
  /*  doc.on("end", () => {
    stream.end();
  }); */

  doc.pipe(res);
  doc.end();
});

routes.get(
  "/pdfincome2/:payment_place/:months/:currency_type",
  async (req, res) => {
    const { payment_place, months, currency_type } = req.params;

    const i = { payment_place, months, currency_type };
    const [results] =
      await promispool.query(`SELECT s.code, s.first_name, s.last_name, s.identity_card, c.name_course,
    CONCAT( FORMAT(cp.amount, 2)) AS amount, cp.currency_type, cp.months,
    DATE_FORMAT(cp.date_time_1, '%Y-%m-%d' ) AS date_time_1, cp.description , cp.payment_place
  FROM control_pay cp
    INNER JOIN student s ON cp.student_id = s.student_id
    INNER JOIN courses c ON c.course_id = s.course_id
  GROUP BY s.code, cp.amount, cp.currency_type, cp.months, cp.date_time_1, cp.description, cp.payment_place
  HAVING cp.payment_place = '${i.payment_place}' AND cp.months = '${i.months}' AND cp.currency_type = '${i.currency_type}';`);

    const stream = res.writeHead(200, {
      "content-type": "application/pdf",
      "content-disposition": `attachment;filename= facturas${Date.now()}.pdf`,
    });

    const table = {
      title: "Informacion de pago",
      subtitle: `L.L.Academy`,
      headers: [
        "codigo",
        "nombre",
        "apellido",
        "cedula",
        "curso",
        "monto",
        "tipo de pago",
        "mes",
        "fecha",
        "descripcion",
        "Sucursal",
      ],

      rows: results.map((result) => [
        `${result.code}`,
        `${result.first_name}`,
        `${result.last_name}`,
        `${result.identity_card}`,
        `${result.name_course}`,
        `${result.amount}`,
        `${result.currency_type}`,
        `${result.months}`,
        `${result.date_time_1}`,
        `${result.description}`,
        `${result.payment_place}`,
      ]),
    };

    await doc.table(table, {
      width: 510,
      x: -1,
    });
    doc.on("data", (data) => {
      stream.write(data);
    });

    /* doc.on("end", () => {
       stream.end();
    }); */
    doc.pipe(res);
    doc.end();
  }
);

routes.get("/attendances", (req, res) => {
  res.render("links/attendances");
});

routes.post("/attendances", async (req, res) => {
  const { code, statu_assistance, months_assitances } = req.body;

  const [results] =
    await promispool.query(`SELECT s.code , s.first_name , s.last_name ,
  ca.statu_assistance,DATE_FORMAT(ca.date_attendance ,'%Y-%m-%d') AS date_attendance , ca.months_assitances FROM control_attendances ca 
   INNER JOIN student s ON ca.student_id = s.student_id
   GROUP BY s.code,ca.statu_assistance,ca.date_attendance, ca.months_assitances
  HAVING s.code ='${code}' AND ca.statu_assistance ='${statu_assistance}' AND ca.months_assitances = '${months_assitances}' ;`);

  res.render("links/attendances", { result: results[0] });
});

routes.get("/intoattendance", (req, res) => {
  res.render("links/intoattendance");
});

routes.post("/intoattendance", async (req, res) => {
  const { date_attendance, statu_assistance, code, months_assitances } =
    req.body;

  await promispool.query(`INSERT INTO control_attendances(date_attendance,statu_assistance,student_id,months_assitances)
  VALUES
    ('${date_attendance}','${statu_assistance}',(SELECT student_id FROM student s WHERE s.code = '${code}'),'${months_assitances}');
   `);

  res.redirect("secretary");
});
export default routes;
