require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yt5iw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// console.log(uri);

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

        const foodsCollection = client.db('food-db').collection('foods');

        // get all foods from db 

        app.get('/foods', async (req, res) => {
            const result = await foodsCollection.find().toArray();
            res.send(result);
        });

        app.get('/foods/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { 'buyer.email': email };
            const result = await foodsCollection.find(filter).toArray();
            res.send(result);
        });

        app.get('/food/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodsCollection.findOne(query);
            res.send(result);
        });

        app.post('/add-food', async (req, res) => {
            const food = req.body;
            const result = await foodsCollection.insertOne(food);
            res.send(result);
        });

        app.put('/update-food/:id', async (req, res) => {
            const id = req.params.id;
            const foodData = req.body;
            const options = { upsert: true };
            const filter = { _id: new ObjectId(id) };
            const updated = {
                $set: foodData
            };
            const result = await foodsCollection.updateOne(filter, updated, options);
            res.send(result);
        });

        app.delete('/food/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodsCollection.deleteOne(query);
            res.send(result);
        });


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('The server is running...');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});