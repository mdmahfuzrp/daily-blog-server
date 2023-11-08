const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");

// MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jlpngjm.mongodb.net/?retryWrites=true&w=majority`;

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

    // My Collections:
    const allBlogsCollection = client.db("dailyBlogDB").collection("allBlogs");
    const allCommentsCollection = client
      .db("dailyBlogDB")
      .collection("allComments");
    const allWishListCollection = client
      .db("dailyBlogDB")
      .collection("allWishlist");

    // --------------- All API FOR CLIENT SITE ---------------------
    // Total Blogs Count
    app.get("/totalBlogs", async (req, res) => {
      const result = await allBlogsCollection.estimatedDocumentCount();
      res.send({ totalBlogs: result });
    });

    // All blogs
    app.get("/all-blogs", async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = page * limit;
      const searchName = req.query.name;
      const searchCategory = req.query.category;
      console.log(searchCategory);
      console.log(searchName);
      const query = {
        $and: [
          searchName
            ? { blogTitle: { $regex: searchName, $options: "i" } }
            : {},
          searchCategory ? { category: searchCategory } : {},
        ],
      };
      try {
        // Fetch blogs and sort them in descending order based on currentDate
        const blogs = await allBlogsCollection
          .find(query)
          .sort({ currentDate: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        res.json(blogs);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res
          .status(500)
          .json({ error: "An error occurred while fetching blogs." });
      }
    });

    // Blog Details
    app.get("/blog-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allBlogsCollection.findOne(query);
      res.send(result);
    });

    // Add Comment
    app.post("/all-comments", async (req, res) => {
      const comment = req.body;
      console.log(comment);
      const addNewComment = await allCommentsCollection.insertOne(comment);
      res.send(addNewComment);
    });

    // Find Specific comment Using blog Id
    app.get("/all-comments/blogId", async (req, res) => {
      let query = {};
      if (req.query.blogId) {
        query = { blogId: req.query.blogId };
      }
      const result = await allCommentsCollection.find(query).sort({ commentTime: -1 }).toArray();
      res.send(result);
    });

    // Top 10 Blogs
    app.get("/top-blogs", async (req, res) => {
      try {
        const topBlogs = await allBlogsCollection
          .find({}, { longDescription: 1 })
          .toArray();

        // Calculate word count for each blog's longDescription
        topBlogs.forEach((blog) => {
          const words = blog.longDescription.split(/\s+/);
          blog.wordCount = words.length;
        });

        // Sort blogs by word count in descending order
        topBlogs.sort((a, b) => b.wordCount - a.wordCount);

        // Take the top 10 blogs
        const top10 = topBlogs.slice(0, 10);

        res.json(top10);
      } catch (error) {
        console.error("Error fetching top blogs:", error);
        res
          .status(500)
          .json({ error: "An error occurred while fetching top blogs." });
      }
    });

    // Add Blogs
    app.post("/add-blog", async (req, res) => {
      const blog = req.body;
      console.log(blog);
      const addNewBlog = await allBlogsCollection.insertOne(blog);
      res.send(addNewBlog);
    });

    // Update blogs
    app.put("/update-blog/:id", async (req, res) => {
      const toyId = req.params.id;
      const updateBlog = req.body;
      console.log(updateBlog);
      const filter = { _id: new ObjectId(toyId) };
      const options = { upsert: true };
      const blog = {
        $set: {
          blogTitle: updateBlog.blogTitle,
          longDescription: updateBlog.longDescription,
          shortDescription: updateBlog.shortDescription,
          blogPhoto: updateBlog.blogPhoto,
        },
      };
      const result = await allBlogsCollection.updateOne(filter, blog, options);
      res.send(result);
    });

    // Find Specific Data Using Email
    app.get("/my-wishlist/email", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { userEmail: req.query.email };
      }
      console.log(query);
      const result = await allWishListCollection.find(query).toArray();
      res.send(result);
    });

    // Get Total WishList Count
    app.get("/all-wishlist/:userEmail", async (req, res) => {
      const userEmail = req.params.userEmail;

      try {
        const count = await allWishListCollection.countDocuments({ userEmail });

        res.send({ totalWishlist: count });
      } catch (error) {
        console.error("Error counting blogs:", error);
        res
          .status(500)
          .send({ error: "An error occurred while counting blogs." });
      }
    });

    // Add blog to Wishlist
    app.post("/all-wishlist", async (req, res) => {
      const blog = req.body;
      console.log(blog);
      const addWishlistBlog = await allWishListCollection.insertOne(blog);
      res.send(addWishlistBlog);
    });

    // Delete blogs
    app.delete("/my-wishlist/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        console.log(query);
        const result = await allWishListCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.json({ message: "Item deleted successfully" });
        } else {
          res.status(404).json({ error: "Item not found" });
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        res
          .status(500)
          .json({ error: "An error occurred while deleting the item." });
      }
    });

    //   --------------------------------------------------------------

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

app.get("/", (req, res) => {
  res.send("Daily blog server running");
});
app.listen(port, (req, res) => {
  console.log("Daily blog server running on port: ", port);
});
