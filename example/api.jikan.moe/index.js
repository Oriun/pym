const fs = require("fs");
const protobuf = require("protocol-buffers");
const { pym } = require("../../dist");

const data = fs.readFileSync(__dirname + "/input.json", "utf-8");
const object = JSON.parse(data);

const proto = protobuf(fs.readFileSync(__dirname + "/schema.proto", "utf-8"));

const schema = pym(fs.readFileSync(__dirname + "/schema.pym", "utf-8"));

console.time("Protocole Buffer");
const protoEncoded = proto.ApiResponse.encode(object);
console.timeEnd("Protocole Buffer");
console.time("Pym");
const pymEncoded = schema.encode("ApiResponse", object);
console.timeEnd("Pym");

console.log(`
JSON : ${data.length} / 100%
Protocole Buffer : ${protoEncoded.byteLength} / ${(
  (protoEncoded.byteLength * 100) /
  data.length
).toFixed(2)}%
Pym : ${pymEncoded.byteLength} / ${(
  (pymEncoded.byteLength * 100) /
  data.length
).toFixed(2)}%
`);

fs.writeFileSync(__dirname + "/output.proto", protoEncoded);
fs.writeFileSync(__dirname + "/output.pym", pymEncoded);
