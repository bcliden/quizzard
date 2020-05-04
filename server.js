const express = require('express')
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

//#region config
const port = 8080
app.use(express.json())
//#endregion config

//#region enums

const SERVER_ACTIONS = Object.freeze({
    NEW_STATE: "<new_state>"
})

//#endregion enums

// #region classes
class Application {
    games = new Map()

    constructor () {}

    generateRoomCode() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        let size = 4
        let code = new Array(4).fill(null)
        for (let i = 0; i < size; i++) {
            code[i] = alphabet[Math.floor(Math.random() * alphabet.length)]
        }
        return code.join('')
    }

    createGame(hostName) {
        let roomCode = this.generateRoomCode()
        while(this.games.has(roomCode)) {
            this.roomCode = this.generateRoomCode()
        }
        this.games.set(roomCode, new Game(roomCode, hostName))
        return roomCode
    }

    findGame(roomCode) {
        for (let game of this.games) {
            if (game[0] === roomCode) {
                return game[1]
            }
        }
        throw new Error(`Game ${roomCode} not found`)
    }

    clearAllGames() {
        this.games.clear()
    }

    endGame(roomCode){
        this.games.delete(roomCode)
    }
}

class Game {
    users = [] // User class
    buzzes = [] // User name, Timestamp
    roomCode
    hostName

    constructor(roomCode, hostName) {
        this.roomCode = roomCode
        this.hostName = hostName
    }

    getBuzzes() {
        // return this.buzzes.sort((a, b) => a.time - b.time)
        return this.buzzes
    }

    addBuzz(name, time) {
        if (this.buzzes.some(el => el.name === name)) {
            throw new Error('User already buzzed in')
        }
        this.buzzes.push({ name, time })
    }

    clearBuzzes() {
        this.buzzes = []
    }

    getUsers() {
        return this.users
    }

    addUser(name) {
        if (!name) {
            throw new Error('No name specified')
        }
        if (this.users.some(el => {
            return el.name === name
        })) {
            // throw new Error('User already registered.')
            return
        }
        // register user
        this.users.push(new User(name))
    }

    updateUserScore(name, number){
        let found = this.users.find(user => user.name === name)
        if (!found) {
            throw new Error("User does not exist.")
        }
        found.incrementScore(number)
    }

    resetGame() {
        this.clearBuzzes()
        this.users.forEach(user => {
            user.resetScore()
        })
    }
}

class User {
    name
    score

    constructor(name) {
        this.name = name
        this.score = 0
    }

    incrementScore(number) {
        this.score += number
    }

    resetScore() {
        this.score = 0
    }
}

const singleton = new Application()

// #endregion classes

// #region http

server.listen(port, () => {
    console.log('Quizzard server is listening on port: ', port)
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/join', (req, res) => {
    console.log("JOIN: ", req.body)
    let { roomCode, name } = req.body
    roomCode = roomCode.toUpperCase()
    name = name.toLowerCase()
    try {
        const game = singleton.findGame(roomCode)
        game.addUser(name)
        res.status(200).json({ roomCode, userName: name, hostName: game.hostName, message: `Found game code. Your host is ${game.hostName}. Enjoy!`})
    } catch (err) {
        res.status(500).json({ message: "Something went wrong. Please try again." })
    }
})

app.post('/create', (req, res) => {
    console.log("CREATE: ", req.body)
    let { hostName } = req.body
    hostName = hostName.toLowerCase()
    try {
        const roomCode = singleton.createGame(hostName)
        res.status(201).json({ roomCode, hostName, message: "Room created. Enjoy!" })
    } catch (err) {
        res.status(500).json({ message: "Something went wrong. Please try again." })
    }
})

// #endregion http
// #region socket.io

io.on('connection', (socket) => {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', (data) => {
    console.log(data);
  });
});

// #endregion socket.io
