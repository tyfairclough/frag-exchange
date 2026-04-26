import test from "node:test";
import assert from "node:assert/strict";
import { buildAliasCandidateFromWordList } from "@/lib/suggested-alias";

test("generated alias includes three words and 4 digits", () => {
  const alias = buildAliasCandidateFromWordList(["reef", "coral", "tank", "salt"]);
  assert.match(alias, /^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-\d{4}$/);
});

test("throws when word list is insufficient", () => {
  assert.throws(() => buildAliasCandidateFromWordList(["reef", "coral"]));
});

