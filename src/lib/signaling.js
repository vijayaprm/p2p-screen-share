export async function encodeSessionKey(id, sdp) {
  const payload = JSON.stringify({ id, sdp });
  const stream = new Blob([payload]).stream();
  const compressed = stream.pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(compressed).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decodeSessionKey(rawKey) {
  if (!rawKey?.trim()) {
    throw new Error('Empty session key.');
  }

  const cleaned = rawKey.trim().replace(/\s+/g, '');
  let base64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  while (base64.length % 4) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream();
  const decompressed = stream.pipeThrough(new DecompressionStream('deflate'));
  const payload = JSON.parse(await new Response(decompressed).text());

  if (!payload.id || !payload.sdp) {
    throw new Error('Session key payload is incomplete.');
  }

  return payload;
}
