"use strict";

const http = require("http");
const bodyParser = require("body-parser");
const express = require("express");
const Int64BE = require("int64-buffer").Int64BE;

function flat(array) {
  const flat = [];
  array.forEach((inner) => {
    inner.forEach((item) => {
      flat.push(item);
    });
  });
  return flat;
}

function getAgent(port) {
  const agent = {
    spans: [],
  };
  const app = express();

  app.use(bodyParser.raw({ type: "application/json" }));
  app.use((req, res, next) => {
    if (req.body.length === 0) {
      return res.status(200).send();
    }
    req.body = [JSON.parse(req.body)];
    next();
  });

  app.post("/v1/trace", (req, res) => {
    agent.spans.push(req.body);
    agent.spans = flat(flat(agent.spans));
    res.status(200).send();
  });

  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    agent.listener = server.listen(port, "localhost", (r) => {
      resolve(agent);
    });
  });
}

module.exports = getAgent;
