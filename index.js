const express = require('express');
const cookieParser = require('cookie-parser')
const cors = require('cors');
require('dotenv').config();
const {google} = require('googleapis');
const { oauth2 } = require('googleapis/build/src/apis/oauth2');
const OAuth2 = google.auth.OAuth2;


const app = express();
const port = process.env.PORT || 3000;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = 'http://localhost:3000/oauth2callback'

const client = new OAuth2(
    client_id,
    client_secret,
    redirect_uri
)

const scopes= ['https://www.googleapis.com/auth/documents']

app.use(cors());
app.use(express.json())
app.use(cookieParser())


app.get('/', (req,res)=>{

    res.cookie('contents', req.query.content, {maxAge: 900000, httpOnly: false})

    const url = client.generateAuthUrl({
        access_type: 'online',
        scope: scopes,
    });

    res.redirect(url)

})

app.get('/oauth2callback', async (req, res) => {
    try {
        let code = req.query.code;
        const {tokens} = await (client.getToken(code));
        client.setCredentials(tokens);
        res.redirect(`/createDoc`)
    } catch (error) {
        console.error(error)
    }
    
})

app.get('/createDoc', async (req, res) => {

    const docs = google.docs({version: "v1", auth: client})

    const contents = req.cookies.contents
    res.clearCookie('contents')
    

    const response = await docs.documents.create({ requestBody: { title: 'Document Created by Docsidian' } });
    
    res.redirect(`https://docs.google.com/document/d/${response.data.documentId}/edit`);

})

app.listen(port, () =>{
    console.log(`at ${port}`)
})