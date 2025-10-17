declare module 'cbor-x' {
  export function encode(value: any): Uint8Array | Buffer;
  export function decode(data: Uint8Array | Buffer): any;
}
