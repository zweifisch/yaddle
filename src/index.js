import {parse} from "./parser";
import {generate} from "./schema";
import fs from "fs";

export const loads = (input)=> parse(input).then(generate);

const readFile = (path) => new Promise((resolve, reject)=>
                                       fs.readFile(path, "utf8", (err, content)=> err ? reject(err) : resolve(content)));

export const load = (path)=> readFile(path).then(loads);
