const http = require("http");
const webSocketServer = require("websocket").server;
require("dotenv").config();
// const app = require("express")();
// app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
// app.listen(9091, () => console.log("listening on http port 9091"));

const httpServer = http.createServer();

httpServer.listen(process.env.PORT || 9090, () =>
  console.log(`listening... on ${process.env.PORT}`)
);

const clients = {};
const games = {};

const wsServer = new webSocketServer({
  httpServer: httpServer,
});

wsServer.on("request", (request) => {
  //connect
  const connection = request.accept(null, request.origin);
  connection.on("open", () => console.log("opened!"));
  connection.on("close", () => console.log("closed!"));
  connection.on("message", (message) => {
    const result = JSON.parse(message.utf8Data);

    //user wants to create new game
    if (result.method === "create") {
      const clientId = result.clientId;

      const gameId = guid();
      games[gameId] = {
        id: gameId,
        balls: 20,
        clients: [],
        state: {},
      };
      const payLoad = {
        method: "create",
        game: games[gameId],
      };

      console.log(`creating game with ID: ${gameId}`);
      const con = clients[clientId].connection;
      con.send(JSON.stringify(payLoad));
    }

    if (result.method === "join") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const game = games[gameId];
      if (game.clients.length >= 3) {
        //sorry max players reach
        return;
      }
      const color = { 0: "Red", 1: "Green", 2: "Blue" }[game.clients.length];
      game.clients.push({ clientId: clientId, color: color });

      const payLoad = {
        method: "join",
        game: game,
      };
      // loop through all clients and update everyone one
      console.log(`Player ${clientId} joining game: ${gameId}`);

      game.clients.forEach((client) => {
        clients[client.clientId].connection.send(JSON.stringify(payLoad));
      });
    }

    if (result.method == "play") {
      const { gameId, ballId, color } = result;
      let state = games[gameId].state;
      if (!state) state = {};
      state[ballId] = color;

      games[gameId].state = state;
      const game = games[gameId];

      const payLoad = {
        method: "update",
        game: game,
      };
      game.clients.forEach((c) => {
        clients[c.clientId].connection.send(JSON.stringify(payLoad));
      });
    }
  });

  //generate new clientId
  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

  console.log(`Player ${clientId} joined server:`);
  const payLoad = {
    method: "connect",
    clientId: clientId,
  };
  //send back client connect
  connection.send(JSON.stringify(payLoad));
});

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
