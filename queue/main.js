let http = require("http");
let queue = [];

function handler(req, res) {
  let { url, method } = req;
  if (method === "POST") {
    let message = "";
    req.on("data", chunk => (message += chunk.toString()));
    req.on("end", () => {
      console.log("Enqueue message:", message);
      queue.push(JSON.parse(message));
      res.end("Enqueued message.");
    });
  } else if (method === "GET" && url === "/queue") {
    res.end(JSON.stringify(queue));
  } else if (method === "GET" && url === "/read") {
    let msg = queue.length ? queue.pop() : "Nothing to see here.";
    res.end(JSON.stringify(msg));
  } else {
    res.writeHead(404);
    res.end("Unhandled route");
  }
}

http.createServer(handler).listen(3001);
