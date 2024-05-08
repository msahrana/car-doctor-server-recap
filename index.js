const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://cardoctor-bd.web.app",
      "https://cardoctor-bd.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crgl3kb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/* won middleware */
const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({massage: "not authorized"});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({massage: "unauthorized"});
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const serviceCollection = client.db("carRecap").collection("services");
    const bookingCollection = client.db("carRecap").collection("booking");

    /* auth token api by jwt */
    //creating Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({success: true});
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({success: true});
    });

    /* service api */
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    /* booking api */
    app.get("/booking", logger, verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        console.log("test");
        return res.status(403).send({massage: "forbidden access"});
      }
      let query = {};
      if (req.query?.email) {
        query = {email: req.query?.email};
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const query = req.body;
      const result = await bookingCollection.insertOne(query);
      res.send(result);
    });

    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateBooking = req.body;
      const updateDoc = {
        $set: {
          status: updateBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ping: 1});
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car Doctor Recap server is running");
});

app.listen(port, () => {
  console.log(`Car Doctor Recap server is running on port: ${port}`);
});
