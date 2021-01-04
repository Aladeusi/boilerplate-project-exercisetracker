require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require("body-parser");
var dns = require('dns');
var sha1 = require('sha1');
// Basic Configuration
const port = process.env.PORT || 3000;
//enable cors
app.use(cors());
//body parser
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
//configure req timeout
const TIMEOUT = 1000000;
//media scanning on poublic folder
app.use('/public', express.static(`${process.cwd()}/public`));
//connect to database - mongodb
const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//define database Schema/migration
const userSchema = new Schema({
  username: String,
});

const exerciseSchema = new Schema({
  userId: mongoose.ObjectId,
  description: String,
  duration: Number,
  date: Date
});
//database model
let User = mongoose.model("User", userSchema);
let Exercise = mongoose.model("Exercise", exerciseSchema);
//ORM repositories
const createNewUser = async (username) => {
  try {
    const created = await User.create({ username })
    return created;
  } catch (e) {
    return e
  }
}

const findOneUserByUsername = async (username) => {
  const user = await User.findOne({ username });
  return user;
}
const findUserById = async (userId) => {
  const user = await User.findById(userId);
  return user;
}

const findAllUsers = async () => {
  const users = await User.find().select({ _id: 1, username: 1 });
  return users;
}

const createNewExercise = async (exercise) => {
  try {
    const created = await Exercise.create({ ...exercise })
    return created;
  } catch (e) {
    return e
  }
}

const findExercisesByUserId = async (userId) => {
  const exercises = await Exercise.find({ userId }).select({ description: 1, duration: 1, date: 1 });
  return exercises;

}

/*const findExercisesByUserId2 = async (userId, from, to, limit)=>{
  const newFrom= new Date(from);
  const newTo= new Date(to);
  const exercises= await Exercise.find({userId, date:{$gte:newFrom}, date:{$lte:newTo}}).limit(Number(limit)).select({description:1, duration:1, date:1});
  return exercises;
  
}*/
//ORM repositories

//endpoints
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

//shorten long url
app.post("/api/exercise/new-user", async (req, res) => {
  try {
    let username = req.query.username;
    username = (username) ? username : req.body.username;
    const user = await createNewUser(username)
    res.json({ username: user.username, _id: user._id })
  } catch (e) {
    res.json({ error: "Some error ocurred. Please try again later." })
  }
})

app.get("/api/exercise/users", async (req, res) => {
  try {
    const users = await findAllUsers()
    res.json(users)
  } catch (e) {
    res.json({ error: "Some error ocurred. Please try again later." })
  }
})

app.post("/api/exercise/add", async (req, res) => {
  try {
    let userId = (req.query.userId) ? req.query.userId : req.body.userId;
    let description = (req.query.description) ? req.query.description : req.body.description;
    let duration = (req.query.duration) ? req.query.duration : req.body.duration;
    let date = (req.query.date) ? req.query.date : req.body.date;
    date = (date) ? date : new Date().toISOString().split("T")[0];
    console.log(date);
    const toCreate = { userId, description, duration: Number(duration), date }
    console.log(toCreate);
    const exercise = await createNewExercise(toCreate)
    const resolveUser = await findUserById(userId);
    const toReturn = { username: resolveUser.username, description: exercise.description, duration: exercise.duration, _id: userId, date: new Date(exercise.date).toDateString() };
    console.log(toReturn)
    res.json(toReturn)
  } catch (e) {
    res.json({ error: "Some error ocurred. Please try again later." })
  }
})

app.get("/api/exercise/log", async (req, res) => {
  const userId = req.query.userId;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit

  const resolveUser = await findUserById(userId);
  if (typeof from === "undefined" && typeof to === "undefined") {
    const log = await Exercise.find({ userId }).limit(Number(limit)).select({ description: 1, duration: 1, date: 1 });
    console.log(log)
    res.json({ username: resolveUser.username, count: log.length, log })

  } else if (typeof limit === "undefined" && typeof from !== "undefined" && typeof to !== "undefined") {
    const log = await Exercise.find({ userId, date: { $gte: from }, date: { $lte: to } }).select({ description: 1, duration: 1, date: 1 });
    console.log(log)
    res.json({ username: resolveUser.username, count: log.length, log })
  
  } else {
    console.log(`${from}~${to}~${limit}`)
    console.log("yum....")
    const log = await findExercisesByUserId(userId)
    console.log(log)
    res.json({ username: resolveUser.username, count: log.length, log })
  }

})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

