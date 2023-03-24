export const defaultCharset =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-/àâéèêëïîôœöûç.#,?!$%&'()*+,-./:;<=>?@[]^_`{|}~ \"°\\\t\n©®’–…";

export const PymModelSchema = `syntax = "1.0"
----
A{
meta:B
particles:C[]
}
B{
syntax:string
charset:string
}
C{
name:string
properties:D[]
}
D{
name:string
type:string|E
}
E{
type: string | E | E[]
array:boolean
}
`;
