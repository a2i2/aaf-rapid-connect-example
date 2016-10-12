import express from "express";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import mockRapidConnect from "aaf-rapid-connect-mock";
import validateJWT from "aaf-rapid-connect-jwt-validator";

const port = process.env.PORT || 3000;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
const ssoUrl = process.env.SSO_URL;
const jwtSecret = process.env.JWT_SECRET || "secret";
const db = { users: [], tokens: [] };
const app = express();

app.set("views", __dirname);

app.set("view engine", "ejs");

app.use(cookieSession({
  secret: "example",
  secureProxy: appUrl.startsWith("https://"),
  maxAge: 3600000
}));

app.get("/", (req, res) => {
  res.render("index", { session: req.session });
});

app.get("/auth", (req, res) => {
  res.redirect(ssoUrl || "/mock_sso");
});

app.post("/auth", bodyParser.urlencoded({ extended: true }), (req, res) => {
  validateJWT({
    assertion: req.body.assertion,
    appUrl,
    jwtSecret,
    findToken: token => db.tokens.includes(token),
    storeToken: token => db.tokens.push(token)
  }).then(attrs => {
    let user = db.users.find(user => user.email === attrs.mail);

    if (!user) {
      db.users.push(user = {
        id: attrs.edupersontargetedid,
        email: attrs.mail,
        name: attrs.displayname,
        registeredAt: new Date()
      });
    }

    Object.assign(req.session, { user });
    res.redirect(appUrl);
  }).catch(error => {
    res.status(500).send(error.message);
  });
});


app.delete("/auth", (req, res) => {
  req.session = null;
  res.sendStatus(204);
});

if (!ssoUrl) {
  app.use("/mock_sso", mockRapidConnect({ appUrl, jwtSecret }));
}

app.listen(port, () => console.log(`Web server started on port ${port}.`));
