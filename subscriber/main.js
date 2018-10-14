let http = require("http");
let request = require("request");
let QUEUE = "http://localhost:3001";

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
