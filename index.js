require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const corsOptions = {
    origin: ['https://restaurant-project-virid.vercel.app','https://restaurant-management-server-rouge.vercel.app'],
    // origin: ['http://localhost:5173', 'http://localhost:4000'],
    credentials: true,
    optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));


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

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' });
        }
        req.user = decoded;
    });
    next();
};

async function run() {
    try {

        const foodsCollection = client.db('food-db').collection('foods');
        const purchaseCollection = client.db('purchase-db').collection('purchases');

        // generate jwt

        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '1d' });
            // console.log(token);
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true });
        });

        app.post('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true });
        });

        // get all foods from db 

    app.get('/foods', async (req, res) => {
    const filter = req.query.filter;
    const search = req.query.search;
    const sort = req.query.sort; 

    let query = {};

    // Search functionality
    if (search) {
        query.foodName = { $regex: search, $options: 'i' };
    }

    // Filter functionality
    if (filter) {
        query.foodCategory = filter;
    }

    // Sorting logic for MongoDB
    let sortOption = {};
    if (sort === "asc") {
        sortOption.price = 1; // Sort by price in ascending order
    } else if (sort === "desc") {
        sortOption.price = -1; // Sort by price in descending order
    }

    // Fetch data from MongoDB with sorting
    const result = await foodsCollection.find(query).sort(sortOption).toArray();

    res.send(result);
});


        // get all food by a single user from db

        app.get('/all-foods/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.user?.email;
            if (decodedEmail !== email) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const filter = { 'buyer.email': email };
            const result = await foodsCollection.find(filter).toArray();
            res.send(result);
        });

        // get a single food data by id from db

        app.get('/food/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodsCollection.findOne(query);
            res.send(result);
        });

        // get all orders by a specific user

        app.get('/my-orders/:email', verifyToken, async (req, res) => {
            const decodedEmail = req.user?.email;
            const email = req.params.email;
            // console.log('email from token -->', decodedEmail);
            // console.log('email from params-->', email);

            if (decodedEmail !== email) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            // console.log(email);
            query = { 'buyer.email': email };
            const result = await purchaseCollection.find(query).toArray();
            // console.log(result);
            res.send(result);
        });

        app.post('/add-food', async (req, res) => {
            const food = req.body;
            const result = await foodsCollection.insertOne(food);
            res.send(result);
        });

        app.post('/purchase-food', async (req, res) => {
            const purchase = req.body;
            // console.log(purchase);
            const query = { 'buyer.email': purchase.buyer?.email, foodId: purchase?.foodId };
            // console.log(query);
            const alreadyExist = await purchaseCollection.findOne(query);
            if (alreadyExist) {
                return res.status(400).send('You have already purchased');
            }
            // console.log('if already exist-->', alreadyExist);

            const result = await purchaseCollection.insertOne(purchase);

            // increase purchase count in food collection
            const filter = { _id: new ObjectId(purchase.foodId) };
            const update = {
                $inc: { purchaseCount: 1 }
            };
            const updatePurchaseCount = await foodsCollection.updateOne(filter, update);
            console.log({ result, updatePurchaseCount });
            res.send({ result, updatePurchaseCount });
        });

        // save a purchase data in db

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
            const result = await purchaseCollection.deleteOne(query);
            res.send(result);
        });


        // await client.db("admin").command({ ping: 1 });
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