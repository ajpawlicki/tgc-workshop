let http = require("http");
let request = require("request");
let querystring = require("querystring");
let { QUEUE_SERVICE_HOST, QUEUE_SERVICE_PORT } = process.env;
let QUEUE = `http://${QUEUE_SERVICE_HOST}:${QUEUE_SERVICE_PORT}`;

function enqueue({ message, onSuccess, onError }) {
  console.log("enqueuing:", message);
  request.post(QUEUE, { json: message }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      onSuccess();
    } else {
      onError(error);
    }
  });
}

function handler(req, res) {
  if (req.url === "/favicon.ico") res.end("");
  if (req.method === "POST") {
    let message = "";
    req.on("data", chunk => (message += chunk.toString()));
    req.on("end", () => {
      enqueue({
        message: JSON.parse(message),
        onSuccess: () => res.end("Message enqueued successfully."),
        onError: err => res.end(`Failed to enqueue message: ${err}`)
      });
    });
  }
}

http.createServer(handler).listen(3000);
