const assert = require("assert");
const fs = require("fs");
const protobuf = require("protocol-buffers");
const { pym } = require("../../dist");

const data = fs.readFileSync(__dirname + "/input.json", "utf-8");
const object = JSON.parse(data);

const proto = protobuf(fs.readFileSync(__dirname + "/schema.proto", "utf-8"));

const schema = pym(fs.readFileSync(__dirname + "/schema.pym", "utf-8"));
console.log("Encoding");
console.time("JSON");
const jsonEncoded = JSON.stringify(object);
console.timeEnd("JSON");
console.time("Protocole Buffer");
const protoEncoded = proto.Response.encode(object);
console.timeEnd("Protocole Buffer");
console.time("Pym");
const pymEncoded = schema.encode("Response", object);
console.timeEnd("Pym");

const model = schema.compile();
fs.writeFileSync(__dirname + "/compiled.pym", model);
console.log(pym.decompile(model));

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

console.log("Decoding");
console.time("JSON");
const jsonDecoded = JSON.parse(data);
console.timeEnd("JSON");
assert.deepEqual(jsonDecoded, object);
console.time("Protocole Buffer");
const protoDecoded = proto.Response.decode(protoEncoded);
console.timeEnd("Protocole Buffer");
assert.deepEqual(protoDecoded, object);
console.time("Pym");
const pymDecoded = schema.decode("Response", pymEncoded);
console.timeEnd("Pym");
assert.deepEqual(pymDecoded, object);
console.log();

const n = 1_000;
console.log("Performances - Encoding");
console.time("JSON.stringify");
for (let i = 0; i < n; i++) {
  JSON.stringify(object);
}
console.timeEnd("JSON.stringify");
console.time("Protocole Buffer");
for (let i = 0; i < n; i++) {
  proto.Response.encode(object);
}
console.timeEnd("Protocole Buffer");
console.time("Pym");
for (let i = 0; i < n; i++) {
  schema.encode("Response", object);
}
console.timeEnd("Pym");
console.log();
console.log("Performances - Decoding");
console.time("JSON.stringify");
for (let i = 0; i < n; i++) {
  JSON.parse(data);
}
console.timeEnd("JSON.stringify");
console.time("Protocole Buffer");
for (let i = 0; i < n; i++) {
  proto.Response.decode(protoEncoded);
}
console.timeEnd("Protocole Buffer");
console.time("Pym");
for (let i = 0; i < n; i++) {
  schema.decode("Response", pymEncoded);
}
console.timeEnd("Pym");
