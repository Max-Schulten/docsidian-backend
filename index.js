const express = require('express');
const cookieParser = require('cookie-parser')
const cors = require('cors');
require('dotenv').config();
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const mongoose = require('mongoose');

async function saveUser(uuid, contents) {
    try {
        const user = new User({
            uuid: uuid,
            contents: contents,
        })
        const save = await user.save();
        console.log(`User Saved: ${save}`);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

const app = express();

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = 'http://localhost:3000/oauth2callback'

const client = new OAuth2(
    client_id,
    client_secret,
    redirect_uri
)

mongoose.connect(mongoURI, { serverApi: { version: '1', strict: true, deprecationErrors: true } });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB Atlas');
});

const userSchema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true},
    contents: {type: String, required: true},
});

const User = mongoose.model('User', userSchema);

const scopes= ['https://www.googleapis.com/auth/documents']

app.use(cors());
app.use(express.json())
app.use(cookieParser())

app.post('/store-data', (req, res) => {
    const {uuid, contents} = req.body;
    if(saveUser(uuid, contents)){
        res.redirect('https://youtube.com')
    } else {
        res.status(400);
    }
})

app.get('/', (req,res)=>{

    res.cookie('uuid', req.query.id, {maxAge: 900000, httpOnly: false})

    const url = client.generateAuthUrl({
        access_type: 'online',
        scope: scopes,
    });

    res.redirect(url)

})

app.get('/oauth2callback', (req, res) => {
    try {
        let code = req.query.code;
        const {tokens} = (client.getToken(code));
        client.setCredentials(tokens);
        res.redirect(`/createDoc`)
    } catch (error) {
        console.error(error)
    }
    
})

app.get('/createDoc', async (req, res) => {

    const docs = google.docs({version: "v1", auth: client})

    const uuid = req.cookies.uuid;

    let contents;

    try {
        contents = await User.findOne({uuid: uuid}); 
    } catch (error) {
        console.error(error);
    }
    res.clearCookie('uuid');
    
    if(!uuid) {
        res.status(400).send("An error occured fetching the contents of your document. Please try again.")
    } else if (!contents) {
        res.status(400).send("An error occured fetching the contents of your document. Please try again.")
    } else {
        const response = await docs.documents.create({ requestBody: { title: 'Document Created by Docsidian' } });
    
        res.redirect(`https://docs.google.com/document/d/${response.data.documentId}/edit`);
    }
})

app.listen(port, () =>{
    console.log(`at ${port}`)
})
