const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORt || 5000

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kqpbf9w.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyJwt = (req, res, next) => {
    console.log('hitting verify jwt');
    console.log(req.headers.authorization)
    const authorization = req.headers.authorization
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1]
    console.log('token verified jwt', token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
            return res.status(403).send({error: true, message: 'unauthorized access'})
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db("carDoctor").collection("services")
        const bookingsCollection = client.db("carDoctor").collection("bookings")

        // jwt 
        app.post('/jwt', (req, res) => {
            const user = req.body
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        // find many 
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // find one 
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const option = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 }
            }
            result = await serviceCollection.findOne(query, option)
            res.send(result)
        })

        // find using query 
        app.get('/bookings', verifyJwt, async (req, res) => {
            const decoded = req.decoded

            console.log('came back after verify', decoded)

            if(decoded.email !== req.query.email){
                return res.status(403).send({error: 1, message: 'forbidden access'})
            }


            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await bookingsCollection.insertOne(booking);
            res.send(result)
        })

        // for updating data 
        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = req.body
            console.log(updatedBooking)
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                }
            }
            const result = await bookingsCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("doctor is running")
})

app.listen(port, () => {
    console.log(`doctor is running on port ${port}`);
})