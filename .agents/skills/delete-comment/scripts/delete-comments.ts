import { resolve } from "node:path";

import { findComments } from "../../../../tools/oxlint/comments/find-comments.ts";

const repositoryRoot = resolve(import.meta.dir, "../../../..");
const NEWLINE = 0x0a;

type Target = { readonly file: string; readonly line: number };

const isBlank = (bytes: Buffer) => /^[ \t\r]*$/u.test(bytes.toString("utf8"));
const isWordByte = (byte: number | undefined) =>
  byte !== undefined && (byte >= 0x80 || /[\w$]/u.test(String.fromCharCode(byte)));

function deleteSpan(source: Buffer, offset: number, length: number): Buffer {
  let start = offset;
  let end = offset + length;
  const lineStart = start === 0 ? 0 : source.lastIndexOf(NEWLINE, start - 1) + 1;
  const newline = source.indexOf(NEWLINE, end);
  const lineEnd = newline === -1 ? source.length : newline;
  const trailing = isBlank(source.subarray(end, lineEnd));

  if (trailing && isBlank(source.subarray(lineStart, start))) {
    start = lineStart;
    end = newline === -1 ? source.length : newline + 1;
  } else if (trailing) {
    while (start > lineStart && (source[start - 1] === 0x20 || source[start - 1] === 0x09)) start--;
  } else {
    while (end < lineEnd && source[end] === 0x20) end++;
  }

  const separator = isWordByte(source[start - 1]) && isWordByte(source[end]) ? " " : "";

  return Buffer.concat([source.subarray(0, start), Buffer.from(separator), source.subarray(end)]);
}

const targets: Target[] = await Bun.file(process.argv[2] ?? "").json();
const wanted = new Set(targets.map((target) => `${target.file}:${target.line}`));
const files = [...new Set(targets.map((target) => target.file))];
let deleted = 0;

for (let index = 0; index < files.length; index += 400) {
  const batch = files.slice(index, index + 400);
  const found = (await findComments(batch)).filter((comment) => wanted.has(`${comment.file}:${comment.line}`));

  for (const [file, comments = []] of Object.entries(Object.groupBy(found, (comment) => comment.file))) {
    const path = resolve(repositoryRoot, file);
    let source = Buffer.from(await Bun.file(path).arrayBuffer());

    for (const comment of comments.toSorted((a, b) => b.byteOffset - a.byteOffset)) {
      source = deleteSpan(source, comment.byteOffset, comment.byteLength);
      deleted++;
    }

    await Bun.write(path, source);
  }

  await Bun.$`bunx oxfmt --no-error-on-unmatched-pattern ${batch}`.cwd(repositoryRoot).quiet().nothrow();
}

console.warn(`Deleted ${deleted} of ${wanted.size} listed comments in ${files.length} files.`);
