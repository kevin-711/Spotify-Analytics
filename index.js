const express = require('express')
const app = express()

const datastore = require('nedb')

require('dotenv').config()

const port = 3000
app.listen(port, () => console.log(`Running at localhost:${port}`))  
app.use(express.static('public'))
app.use(express.json({limit: '1mb'}))

var SpotifyWebApi = require('spotify-web-api-node')

const scopes = [
    'user-read-email',
    'user-read-private',
    'playlist-read-collaborative',
    'playlist-read-private'
]

let temp_database = {}
const database = new datastore('database.db')
database.loadDatabase()

const spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.URL + '/callback',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
});

let id;

app.get('/login/:userid', (req, res) => {
    id = req.params.userid
    // console.log("User id: ", req.params.userid)
    // console.log(spotifyApi.createAuthorizeURL(scopes) + `?userid=${req.params.userid}`)
    // res.redirect(spotifyApi.createAuthorizeURL(scopes) + `?userid=${req.params.userid}`)
    res.redirect(spotifyApi.createAuthorizeURL(scopes))
});

app.get('/auth', (req, res) => {
    res.send({url: process.env.URL})
})


app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }

    // console.log("State: ", state)
    // console.log("Code: ", code)

    spotifyApi.authorizationCodeGrant(code).then(async (data) => {
        // console.log(data)
        const access_token = data.body['access_token'];
        const refresh_token = data.body['refresh_token'];
        const expires_in = data.body['expires_in'];

        database.insert({
            id: id,
            access_token: access_token, 
            refresh_token: refresh_token
        })

        console.log('access_token:', access_token);
        console.log('refresh_token:', refresh_token);
        console.log(`Sucessfully retreived access token. Expires in ${expires_in} s.`);
        
        res.send('Success! You can now close the window.');
        // console.log(temp_database)

        // TODO: Fix this so that it works on a per user basis (move to client side to call/refresh here)
        setInterval(async () => {
            const data = await spotifyApi.refreshAccessToken();
            const access_token = data.body['access_token'];

            console.log('The access token has been refreshed!');
            console.log('access_token:', access_token);
            spotifyApi.setAccessToken(access_token);
        }, expires_in / 2 * 1000);
    }).catch(error => {
        console.error('Error getting Tokens:', error);
        res.send(`Error getting Tokens: ${error}`);
    });

});

app.get('/getsongs/:userid', (req, res) => {
    
    const userid = req.params.userid
    const id = req.query.id
    const offset = req.query.offset

    database.find({id: userid}).exec(function (err, data) {

        const access_token = data[0].access_token

        spotifyApi.setAccessToken(access_token);
    
        spotifyApi.getPlaylistTracks(id, {
            offset: offset,
            limit: 100,
            fields: 'items'
        }).then(function(data) {
            res.send(data.body)
        },
        function(err) {
            console.log('Something went wrong!', err);
            res.send(err)
        });

    })

})

app.get('/getplaylists/:userid', (req, res) => {
    
    // console.log("Request recieved")

    const userid = req.params.userid

    database.find({id: userid}).exec(function (err, data) {

        const access_token = data[0].access_token
        
        spotifyApi.setAccessToken(access_token);
    
        spotifyApi.getUserPlaylists().then(function(data) {
            res.send(data.body)
        },function(err) {
            console.log('Something went wrong! playlist', err);
            res.send(err)
        });
    })

})

app.get('/userauthenticated/:userid', (req, res) => {

    const userid = req.params.userid
    // console.log(userid)
    // console.log("Temp: ", temp_database)

    database.find({id: userid}).exec(function (err, data) {

        if (data.length == 0) {
            res.send(false)
        } else {
            res.send(true)
        }
    })

})