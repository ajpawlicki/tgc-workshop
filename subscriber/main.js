let http = require("http");
let request = require("request");
let { QUEUE_SERVICE_HOST, QUEUE_SERVICE_PORT } = process.env;
let QUEUE = `http://${QUEUE_SERVICE_HOST}:${QUEUE_SERVICE_PORT}`;

function handler(req, res) {
  if (req.url === "/favicon.ico") res.end("");
  else
    request(`${QUEUE}/read`, (error, response, body) => {
      if (error) {
        res.end(JSON.stringify(error));
      } else {
        res.end(body);
      }
    });
}

http.createServer(handler).listen(3002);
