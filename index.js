const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const app = express();
app.set("view engine", "pug");
const bcrypt = require("bcryptjs");
const initSqlJs = require("sql.js");

let port = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, "database.sqlite");

let db; // instance sql.js en mémoire

// ---------- Initialisation de la base ----------
async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);

    // Migration : ajout de la colonne favorite si absente
    const cols = query("PRAGMA table_info(categories)");
    if (!cols.some((c) => c.name === "favorite")) {
      db.run("ALTER TABLE categories ADD COLUMN favorite INTEGER DEFAULT 0");
      saveDb();
    }
  } else {
    db = new SQL.Database();
    db.run(`
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                prenom TEXT,
                nom TEXT,
                email TEXT UNIQUE,
                birthday TEXT,
                password TEXT
            );
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                type TEXT,
                main TEXT,
                sub TEXT,
                favorite INTEGER DEFAULT 0
            );
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                timestamp INTEGER,
                date TEXT,
                type TEXT,
                categorie TEXT,
                name TEXT,
                montant REAL,
                frais INTEGER,
                description TEXT
            );
        `);
    saveDb();
  }
}

// écrit l'état actuel de la DB en mémoire sur le disque
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

// exécute une requête et retourne les résultats sous forme de tableau d'objets
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// exécute une requête d'écriture (insert/update/delete) et sauvegarde
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function newId() {
  return crypto.randomUUID();
}

// ---------- Helpers métier ----------

// Reconstruit les catégories et sépare les favoris :
// - favoris.mains: tableau des catégories principales favorites
// - favoris.subs: objet associant chaque catégorie principale à la liste de ses sous-catégories favorites
function getCategories(userId) {
  const rows = query(
    "SELECT type, main, sub, favorite FROM categories WHERE user_id = ?",
    [userId],
  );

  const result = {
    revenue: {},
    depense: {},
    favoris: {
      revenue: { mains: [], subs: {} },
      depense: { mains: [], subs: {} },
    },
  };

  rows.forEach(({ type, main, sub, favorite }) => {
    if (!result[type][main]) {
      result[type][main] = [];
    }

    if (sub && !result[type][main].includes(sub)) {
      result[type][main].push(sub);
    }

    if (favorite === 1) {
      // Sous catégorie favorite
      if (sub) {
        if (!result.favoris[type].subs[main]) {
          result.favoris[type].subs[main] = [];
        }

        result.favoris[type].subs[main].push(sub);
      }

      // Catégorie principale favorite
      else {
        result.favoris[type].mains.push(main);
      }
    }
  });
console.log('test',result.favoris)
  return result;
}

// les 20 dernières transactions (incluant les 'delete') pour un user
function getLastUpdate(userId) {
  const rows = query(
    `SELECT timestamp AS timeStamp, date, type, categorie, name, montant, frais, description
         FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20`,
    [userId],
  );
  return rows.reverse().map((r) => ({ ...r, frais: !!r.frais }));
}

function getUserByEmail(email) {
  const rows = query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

// ---------- Routes ----------

initDb().then(() => {
  app.listen(port, "localhost", () => console.log(`Listening at ${port}`));
}).catch((error) => {
  console.error("Initialisation de la base impossible", error);
  process.exitCode = 1;
});

app.use(express.static(__dirname + "/public/"));
app.use(express.json());

app.get("/", function (req, res) {
  const filePath = path.join(__dirname, "public", "index.html");
  res.sendFile(filePath);
});

app.post("/newUser", async (request, response) => {
  const data = request.body;
  const { prenom, nom, email, date, password } = data;

  if (getUserByEmail(email)) {
    return response.json({
      statut: "fail",
      err: `L'adresse e-mail ${email} est déja utilisée`,
    });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const id = newId();

  run(
    "INSERT INTO users (id, prenom, nom, email, birthday, password) VALUES (?,?,?,?,?,?)",
    [id, prenom, nom, email, date, hashed],
  );

  return response.json({ statut: "success" });
});

app.post("/login", async (request, response) => {
  console.log("tentative de connexion...");
  const data = request.body;
  const user = getUserByEmail(data.id);

  if (!user) {
    console.log("aie pas de compte trouvé");
    return response.json({
      statut: "fail",
      err: "Aucun utilisateur correspondant à cette adresse e-mail",
    });
  }

  bcrypt.compare(data.password, user.password, function (err, res) {
    if (res) {
      const sendData = {
        lastUpdate: getLastUpdate(user.id),
        categories: getCategories(user.id),
      };
      console.log("utilisateur logged");
      return response.json({
        statut: "success",
        userId: { mail: user.email, name: user.prenom },
        data: sendData,
      });
    } else {
      console.log("mot de passe incorrect");
      return response.json({ statut: "fail", err: "Mot de passe Incorrect" });
    }
  });
});

app.post("/add", async (request, response) => {
  console.log("nouvelle entree...");
  const body = request.body;
  const user = getUserByEmail(body.user);

  if (!user)
    return response.json({ statut: "fail", err: "Utilisateur inconnu" });

  run(
    `INSERT INTO transactions (user_id, timestamp, date, type, categorie, name, montant, frais, description)
         VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      user.id,
      body.timeStamp || Date.now(),
      body.date,
      body.type,
      body.categorie || null,
      body.name || null,
      parseFloat(body.montant) || null,
      body.frais ? 1 : 0,
      body.description || null,
    ],
  );

  const sendData = {
    lastUpdate: getLastUpdate(user.id),
    categories: getCategories(user.id),
  };
  return response.json({ statut: "success", data: sendData });
});

app.post("/delete", async (request, response) => {
  console.log("Nouvelle suppression...");
  const body = request.body;
  const user = getUserByEmail(body.user);
  const element = body.element;

  if (!user)
    return response.json({ statut: "fail", err: "Utilisateur inconnu" });

  // trouve la transaction correspondante (par timestamp) et non déjà marquée 'delete'
  const rows = query(
    `SELECT id FROM transactions WHERE user_id = ? AND timestamp = ? AND type != 'delete'`,
    [user.id, element.timeStamp],
  );

  if (rows.length === 0) {
    return response.json({ statut: "failed", err: "Document n'existe pas" });
  }

  run("DELETE FROM transactions WHERE id = ?", [rows[0].id]);

  // ajoute une entrée 'delete' dans l'historique
  run(
    `INSERT INTO transactions (user_id, timestamp, date, type, categorie, name, montant, frais, description)
         VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      user.id,
      Date.now(),
      element.date,
      "delete",
      element.categorie || null,
      element.name || null,
      parseFloat(element.montant) || null,
      element.frais ? 1 : 0,
      element.description || null,
    ],
  );

  const sendData = {
    lastUpdate: getLastUpdate(user.id),
    categories: getCategories(user.id),
  };
  return response.json({ statut: "success", data: sendData });
});

app.post("/addCategory", async (request, response) => {
  console.log("Ajout de Categorie...");
  const data = request.body;
  const type = data.type === "Dépense" ? "depense" : "revenue";
  const user = getUserByEmail(data.user);

  if (!user)
    return response.json({ statut: "failed", err: "Utilisateur inconnu" });

  if (data.categorie === "main") {
    const existing = query(
      "SELECT 1 FROM categories WHERE user_id = ? AND type = ? AND main = ?",
      [user.id, type, data.main],
    );
    if (existing.length > 0) {
      return response.json({
        statut: "failed",
        err: "Cette catégorie Principale existe Déja",
      });
    }
    run(
      "INSERT INTO categories (user_id, type, main, sub, favorite) VALUES (?,?,?,?,0)",
      [user.id, type, data.main, data.second],
    );
  } else {
    const existing = query(
      "SELECT 1 FROM categories WHERE user_id = ? AND type = ? AND main = ? AND sub = ?",
      [user.id, type, data.main, data.second],
    );
    if (existing.length > 0) {
      return response.json({
        statut: "failed",
        err: "Cette sous-catégorie existe Déja",
      });
    }
    run(
      "INSERT INTO categories (user_id, type, main, sub, favorite) VALUES (?,?,?,?,0)",
      [user.id, type, data.main, data.second],
    );
  }

  const sendData = {
    lastUpdate: getLastUpdate(user.id),
    categories: getCategories(user.id),
  };
  return response.json({ statut: "success", data: sendData });
});

app.post("/delCategory", async (request, response) => {
  console.log("Suppression de Categorie...");
  const data = request.body;
  const type = data.type === "Dépense" ? "depense" : "revenue";
  const user = getUserByEmail(data.user);

  if (!user)
    return response.json({ statut: "failed", err: "Utilisateur inconnu" });

  if (data.categorie === "main") {
    run("DELETE FROM categories WHERE user_id = ? AND type = ? AND main = ?", [
      user.id,
      type,
      data.main,
    ]);
  } else {
    run(
      "DELETE FROM categories WHERE user_id = ? AND type = ? AND main = ? AND sub = ?",
      [user.id, type, data.main, data.second],
    );
  }

  const sendData = {
    lastUpdate: getLastUpdate(user.id),
    categories: getCategories(user.id),
  };
  return response.json({ statut: "success", data: sendData });
});

// Gère le basculement favori :
// - Soit d'une catégorie entière : si sub n'est pas fourni (ou vide)
// - Soit d'un élément spécifique : si sub est fourni
app.post("/toggleFavorite", (req, res) => {
  const { user, type, main, sub } = req.body;

  const userAccount = getUserByEmail(user);

  if (!userAccount) {
    return res.json({
      statut: "failed",
      err: "Utilisateur inconnu",
    });
  }

  const opType =
    type === "Revenue" || type === "revenue" ? "revenue" : "depense";

  let rows;

  // Sous catégorie
  if (sub && sub.trim() !== "") {
    rows = query(
      `SELECT favorite FROM categories
             WHERE user_id = ?
             AND type = ?
             AND main = ?
             AND sub = ?`,
      [userAccount.id, opType, main, sub],
    );
  }

  // Catégorie principale
  else {
    rows = query(
      `SELECT favorite FROM categories
             WHERE user_id = ?
             AND type = ?
             AND main = ?
             AND (sub IS NULL OR sub = '')`,
      [userAccount.id, opType, main],
    );
  }

  if (rows.length === 0) {
    return res.json({
      statut: "failed",
      err: "Catégorie introuvable",
    });
  }

  const newValue = rows[0].favorite === 1 ? 0 : 1;

  if (sub && sub.trim() !== "") {
    run(
      `UPDATE categories
             SET favorite = ?
             WHERE user_id = ?
             AND type = ?
             AND main = ?
             AND sub = ?`,
      [newValue, userAccount.id, opType, main, sub],
    );
  } else {
    run(
      `UPDATE categories
             SET favorite = ?
             WHERE user_id = ?
             AND type = ?
             AND main = ?
             AND (sub IS NULL OR sub = '')`,
      [newValue, userAccount.id, opType, main],
    );
  }

  const sendData = {
    categories: getCategories(userAccount.id),
  };

  return res.json({
    statut: "success",
    data: sendData,
  });
});

app.post("/requestData", async (request, response) => {
  console.log("request data...");
  const userEmail = request.body.user;
  const type = request.body.request.type;
  const options = request.body.request.options;
  const user = getUserByEmail(userEmail);

  if (!user)
    return response.json({ statut: "Error", info: "Utilisateur inconnu" });

  if (type === "getYears") {
    const rows = query(
      `SELECT DISTINCT substr(date,1,4) AS year FROM transactions WHERE user_id = ? ORDER BY year DESC`,
      [user.id],
    );
    return response.json({ statut: "ok", years: rows.map((r) => r.year) });
  }

  if (type === "updateItem") {
    const { extraData } = options;
    if (!extraData || !extraData.id) {
      return response.json({
        statut: "Error",
        info: "Données invalides pour la mise à jour",
      });
    }

    run(
      `UPDATE transactions 
             SET name = ?, montant = ?, categorie = ?, description = ? 
             WHERE id = ? AND user_id = ?`,
      [
        extraData.name,
        parseFloat(extraData.montant) || 0,
        extraData.categorie,
        extraData.description || null,
        extraData.id,
        user.id,
      ],
    );

    return response.json({ success: true, message: "Mis à jour avec succès" });
  }

  if (type === "getData") {
    console.log("someone call for data!");

    if (options.day == null) {
      const annual = options.month == null;
      const period = annual ? String(options.year) : `${options.year}-${options.month}`;
      const start = annual ? `${period}-01-01` : `${period}-01`;
      const rows = query(
        `SELECT date, type, montant, categorie, name, description FROM transactions
         WHERE user_id = ? AND type != 'delete' AND substr(date,1,?) = ?
         ORDER BY date DESC, timestamp DESC`,
        [user.id, period.length, period],
      );
      const previous = query(
        `SELECT type, categorie, name, SUM(montant) AS montant FROM transactions
         WHERE user_id = ? AND type != 'delete' AND substr(date,1,?) = strftime(?, ?, ?)
         GROUP BY type, categorie, name`,
        [user.id, period.length, annual ? "%Y" : "%Y-%m", start, annual ? "-1 year" : "-1 month"],
      );
      function totals(items) {
        const sums = { depense: 0, revenu: 0 };
        for (const row of items) {
          sums[row.type === "depense" ? "depense" : "revenu"] += row.montant;
        }
        return sums;
      }
      const body = {
        ...totals(rows),
        expenses: rows.filter((row) => row.type === "depense"),
        previousExpenses: previous.filter((row) => row.type === "depense"),
      };
      if (annual) body.previousTotals = totals(previous);
      else body.validDay = rows.map((row) => row.date.split("-")[2]);
      return response.json({ statut: annual ? "year" : "month", body });
    } else {
      // détail du jour
      const rows = query(
        `SELECT * FROM transactions
                 WHERE user_id = ? AND date = ? AND type != 'delete'`,
        [user.id, `${options.year}-${options.month}-${options.day}`],
      );
      let [depense, revenu, infoDay] = [0, 0, []];
      rows.forEach((r) => {
        infoDay.push(r);
        if (r.type === "depense") depense += r.montant;
        else revenu += r.montant;
      });
      return response.json({
        statut: "day",
        body: { depense, revenu, infoDay },
      });
    }
  }

  return response.json({
    statut: "Error",
    info: `type "${type}" is not defined`,
  });
});
app.post("/getLastTransactions", async (request, response) => {
  const body = request.body;
  const user = getUserByEmail(body.user);

  if (!user) {
    return response.json({ statut: "fail", err: "Utilisateur inconnu" });
  }

  const rows = query(
    `SELECT id, timestamp AS timeStamp, date, type, categorie, name, montant, frais, description
     FROM transactions 
     WHERE user_id = ? AND type != 'delete' 
     ORDER BY timestamp DESC 
     LIMIT 50`,
    [user.id]
  );

  const transactions = rows.map((r) => ({ ...r, frais: !!r.frais }));

  return response.json({
    statut: "success",
    data: transactions
  });
});
