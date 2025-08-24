import express from "express";
import { createRequestHandler } from "@remix-run/express";
import * as build from "./build/index.js";

const app = express();

app.all(
  "*",
  createRequestHandler({
    build,
    mode: process.env.NODE_ENV
  })
);

export default app;
