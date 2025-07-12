const express = require('express')
const cors = require("cors");
const app = express()
require("dotenv").config();


// Middleware
app.use(cors());
app.use(express.json());


// Mongodb process

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gwegko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const usersCollection = client.db("studysphere").collection("users");


        // step 1: users data receive 
        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };

            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: "User already exists", inserted: false });
            }

            const result = await usersCollection.insertOne(user);
            res.send({ message: "User created", inserted: true, result });
        });

        // GET /users?search=keyword
        app.get("/users", async (req, res) => {
            const search = req.query.search;
            if (!search) {
                return res.status(400).json({ message: "Search keyword is required" })
            }
            const regex = new RegExp(search, "i");
            const query = search
                ? {
                    $or: [
                        { name: { $regex: regex, $options: "i" } },
                        { email: { $regex: regex, $options: "i" } },
                    ],
                }
                : {};

            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });




        // GET /users/search?keyword=xyz
        app.get("/users/search", async (req, res) => {
            try {
                const keyword = req.query.keyword?.trim();

                if (!keyword) {
                    return res.status(400).json({ message: "Search keyword is required." });
                }

                const regex = new RegExp(keyword, "i"); // "i" = case-insensitive

                const users = await usersCollection.find({
                    $or: [
                        { name: { $regex: regex } },
                        { email: { $regex: regex } },
                    ],
                }).toArray(); // Exclude sensitive fields

                res.status(200).json(users);
            } catch (error) {
                console.error("Search error:", error);
                res.status(500).json({ message: "Server error" });
            }
        });


        app.get('/users/role', async (req, res) => {
            const email = req.query.email;
            const result = await usersCollection.findOne({ email })
            res.send(result)
        })


        // PATCH /users/role/:id
        app.patch("/users/role/:id", async (req, res) => {
            const id = req.params.id;
            const { role } = req.body;

            const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role } }
            );

            res.send(result);
        });








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);








// root route
app.get("/", (req, res) => {
    res.send("Study Sphere Server is running!");
});

// start the server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
});