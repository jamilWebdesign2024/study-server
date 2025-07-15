const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Mongodb process

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gwegko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("studysphere").collection("users");
    const sessionsCollection = client.db("studysphere").collection("sessions");
    const reviewsCollection = client.db("studysphere").collection("reviews");
    const bookedSessionCollection = client
      .db("studysphere")
      .collection("bookedSession");
    const notesCollection = client.db("studysphere").collection("notes");
    const materialsCollection = client.db("studysphere").collection("materials");


    // Stripe post for intent
    // for payment confirmation from stripe
    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents, // Stripe works in cents
        currency: "usd", // or 'bdt' if applicable for test
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

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
        return res.status(400).json({ message: "Search keyword is required" });
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
          return res
            .status(400)
            .json({ message: "Search keyword is required." });
        }

        const regex = new RegExp(keyword, "i"); // "i" = case-insensitive

        const users = await usersCollection
          .find({
            $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
          })
          .toArray(); // Exclude sensitive fields

        res.status(200).json(users);
      } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.get("/users/role", async (req, res) => {
      const email = req.query.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

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

    // ****************Study Session related APIs************
    // ****************Study Session related APIs************
    // ****************Study Session related APIs************
    // ****************Study Session related APIs************

    // to get all session in an array

    app.get("/sessions/all", async (req, res) => {
      const allSessions = await sessionsCollection.find().toArray();
      res.send(allSessions);
    });

    // GET /sessions?tutorEmail=example@example.com
    app.get("/sessions", async (req, res) => {
      try {
        const { tutorEmail } = req.query;

        if (!tutorEmail) {
          return res
            .status(400)
            .json({ error: "tutorEmail query param is required" });
        }

        const sessions = await sessionsCollection
          .find({ tutorEmail })
          .sort({ createdAt: -1 }) // optional: latest first
          .toArray();

        res.status(200).json(sessions);
      } catch (error) {
        console.error("Error fetching tutor sessions:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // get only 6 card of study session usning limit and filtering

    app.get("/sessions/home", async (req, res) => {
      try {
        const sessions = await sessionsCollection
          .find({ status: "approved" })
          .sort({ createdAt: -1 }) // latest first
          .limit(6)
          .toArray();

        res.status(200).json(sessions);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Re apply for rejected applicatons in tutor dashborad

    app.patch("/sessions/reapply/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const filter = { _id: new ObjectId(id), status: "rejected" };
        const update = { $set: { status: "pending" } };

        const result = await sessionsCollection.updateOne(filter, update);

        if (result.modifiedCount > 0) {
          res.status(200).json({ modifiedCount: result.modifiedCount });
        } else {
          res
            .status(404)
            .json({ message: "Session not found or not rejected" });
        }
      } catch (error) {
        console.error("Reapply request failed:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // to approve study session status

    app.patch("/sessions/approve/:id", async (req, res) => {
      const { id } = req.params;
      const { registrationFee } = req.body;

      const result = await sessionsCollection.updateOne(
        { _id: new ObjectId(id), status: "pending" },
        {
          $set: {
            status: "approved",
            registrationFee: Number(registrationFee) || 0,
          },
        }
      );
      res.send(result);
    });

    // to reject study session amont or data

    app.patch("/sessions/reject/:id", async (req, res) => {
      const { id } = req.params;
      const result = await sessionsCollection.updateOne(
        { _id: new ObjectId(id), status: "pending" },
        { $set: { status: "rejected" } }
      );
      res.send(result);
    });

    // to delete study session

    app.delete("/sessions/:id", async (req, res) => {
      const { id } = req.params;
      const result = await sessionsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Create Study Seccion for Tutor
    app.post("/sessions", async (req, res) => {
      try {
        const sessionData = req.body;

        // Optionally add server-side checks or defaults here
        if (!sessionData.tutorEmail || !sessionData.sessionTitle) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        console.log(sessionData);

        const result = await sessionsCollection.insertOne(sessionData);

        if (result.insertedId) {
          return res.status(201).json({ insertedId: result.insertedId });
        } else {
          return res.status(500).json({ message: "Failed to create session" });
        }
      } catch (err) {
        console.error("Error creating session:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    });

    // Assuming you have already connected to MongoDB and have a sessions collection
    app.get("/sessions/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const session = await sessionsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!session) {
          return res.status(404).json({ error: "Study session not found" });
        }

        res.json(session);
      } catch (err) {
        console.error("Error fetching session by ID:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ************reviews get************

    app.get("/reviews", async (req, res) => {
      const { sessionId } = req.query;

      try {
        if (!sessionId) {
          return res.status(400).json({ error: "sessionId is required" });
        }

        const reviews = await reviewsCollection
          .find({ sessionId: sessionId })
          .sort({ createdAt: -1 }) // optional: latest review first
          .toArray();

        res.status(200).json(reviews);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Add this in your backend
    app.post("/reviews", async (req, res) => {
      const review = req.body;

      if (
        !review.sessionId ||
        !review.studentEmail ||
        !review.rating ||
        !review.comment
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      review.createdAt = new Date(); // optional, for sorting

      try {
        const result = await reviewsCollection.insertOne(review);
        res.status(201).json({ insertedId: result.insertedId });
      } catch (error) {
        console.error("Failed to insert review:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // -----------------

    // POST: Book a study session
    app.post("/bookedSessions", async (req, res) => {
      try {
        const {
          sessionId,
          studentEmail,
          tutorEmail,
          sessionTitle,
          tutorName,
          registrationFee,
          classStartDate,
          classEndDate,
          status,
        } = req.body;

        // Basic validation
        if (!sessionId || !studentEmail || !tutorEmail || !sessionTitle) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // ✅ Check if already booked by this user for this session
        const existingBooking = await bookedSessionCollection.findOne({
          sessionId,
          studentEmail,
        });

        if (existingBooking) {
          return res
            .status(409)
            .json({ message: "You have already booked this session." });
        }

        // Proceed with booking
        const bookingData = {
          sessionId,
          studentEmail,
          tutorEmail,
          sessionTitle,
          tutorName,
          registrationFee,
          classStartDate,
          classEndDate,
          status: status || "booked",
          bookedAt: new Date(),
        };

        const result = await bookedSessionCollection.insertOne(bookingData);
        res.status(201).json({
          message: "Session booked successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Booking failed:", error);
        res.status(500).json({ message: "Failed to book session" });
      }
    });

    // to get bookedSession by user email
    app.get("/bookedSession/user", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const bookings = await bookedSessionCollection
          .find({ studentEmail: email })
          .sort({ bookedAt: -1 }) // Optional: recent bookings first
          .toArray();

        res.status(200).json(bookings);
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
        res.status(500).json({ message: "Failed to fetch bookings" });
      }
    });

    // *********update patch******************

    // In your server routes file (e.g., sessions.routes.js)
    app.patch("/update/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        if (
          !updateData.sessionTitle ||
          !updateData.registrationStartDate ||
          !updateData.registrationEndDate
        ) {
          return res
            .status(400)
            .json({ message: "Required fields are missing" });
        }

        const result = await sessionsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Session not found" });
        }

        if (result.modifiedCount === 0) {
          return res.status(200).json({ message: "No changes were made" });
        }

        res.status(200).json({ message: "Update successful", result });
      } catch (error) {
        console.error("Error updating session:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });



    // Example Express route
    app.get('/bookedSessions/check', async (req, res) => {
      // ✅ এই path frontend এ match করবে
      try {
        const { studentEmail, sessionId } = req.query;
        const booking = await bookedSessionCollection.findOne({
          studentEmail,
          sessionId
        });
        res.status(200).json(booking ? [booking] : []);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });




    // ******student note related**********
    // POST /notes - Create a new note
    app.post("/notes", async (req, res) => {
      try {
        const { email, title, description } = req.body;

        // Validation
        if (!email || !title || !description) {
          return res.status(400).json({
            success: false,
            message: "All fields are required (email, title, description)"
          });
        }

        const newNote = {
          email,
          title,
          description,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active"
        };

        const result = await notesCollection.insertOne(newNote);

        res.status(201).json({
          success: true,
          message: "Note created successfully",
          insertedId: result.insertedId,
          note: newNote
        });
      } catch (error) {
        console.error("Error creating note:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create note",
          error: error.message
        });
      }
    });



// GET /notes - Get all notes for a user with search functionality
app.get("/notes", async (req, res) => {
  try {
    const { email, search } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Build query with optional search
    const query = { email };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const notes = await notesCollection.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .toArray();

    res.status(200).json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
      error: error.message
    });
  }
});




// GET /notes/:id - Get single note by ID
app.get("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID"
      });
    }

    const note = await notesCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    res.status(200).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch note",
      error: error.message
    });
  }
});



// PATCH /notes/:id - Update a note
app.patch("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID"
      });
    }

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        message: "At least one field (title or description) is required for update"
      });
    }

    const updateFields = {
      updatedAt: new Date()
    };

    if (title) updateFields.title = title;
    if (description) updateFields.description = description;

    const result = await notesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update note",
      error: error.message
    });
  }
});





// DELETE /notes/:id - Delete a note
app.delete("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID"
      });
    }

    const result = await notesCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found or already deleted"
      });
    }

    res.status(200).json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete note",
      error: error.message
    });
  }
});


// *************************Materials api*********************************


// routes/materials.js or inside app.post('/materials', ...)
app.post('/materials', async (req, res) => {
  try {
    const { title, imageUrl, sessionId, tutorEmail, resourceLinks } = req.body;

    // basic validation
    if (!title || !imageUrl || !sessionId || !tutorEmail || !resourceLinks?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const material = {
      title,
      imageUrl,
      sessionId,
      tutorEmail,
      resourceLinks, // accepts [{url, type}, ...]
      uploadedAt: new Date()
    };

    const result = await materialsCollection.insertOne(material);
    res.status(201).json({ message: "Material uploaded", insertedId: result.insertedId });

  } catch (error) {
    console.error("Material upload error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});




// GET materials for a tutor
app.get('/materials', async (req, res) => {
  try {
    const { tutorEmail } = req.query;
    if (!tutorEmail) {
      return res.status(400).json({ message: "tutorEmail query param is required" });
    }

    const materials = await materialsCollection
      .find({ tutorEmail })
      .sort({ uploadedAt: -1 })
      .toArray();

    res.status(200).json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// DELETE material by ID
app.delete('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid material ID" });
    }

    const result = await materialsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Material not found or already deleted" });
    }

    res.status(200).json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// PATCH (update) material by ID
app.patch('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, resourceLinks } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid material ID" });
    }

    if (!title || !Array.isArray(resourceLinks)) {
      return res.status(400).json({ message: "Title and resourceLinks are required" });
    }

    const updateData = {
      title,
      resourceLinks,
      // Optionally update updatedAt field if you want
      updatedAt: new Date()
    };

    const result = await materialsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.status(200).json({ message: "Material updated successfully" });
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
