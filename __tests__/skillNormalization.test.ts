import { describe, it, expect } from "vitest";
import {
  normalizeSkill,
  canonicalize,
  expandSynonyms,
  matchesNormalized,
} from "../lib/rules/helpers/skillNormalization";

describe("normalizeSkill", () => {
  it("lowercases", () => {
    expect(normalizeSkill("React")).toBe("react");
  });

  it("strips .js suffix", () => {
    expect(normalizeSkill("React.js")).toBe("react");
    expect(normalizeSkill("Node.js")).toBe("node");
    expect(normalizeSkill("Express.js")).toBe("express");
  });

  it("strips .ts suffix", () => {
    expect(normalizeSkill("Deno.ts")).toBe("deno");
  });

  it("strips .py suffix", () => {
    expect(normalizeSkill("Flask.py")).toBe("flask");
  });

  it("collapses whitespace", () => {
    expect(normalizeSkill("  machine   learning  ")).toBe("machine learning");
  });

  it("preserves special chars in C++ and C#", () => {
    expect(normalizeSkill("C++")).toBe("c++");
    expect(normalizeSkill("C#")).toBe("c#");
  });
});

describe("canonicalize", () => {
  it("maps alias to canonical form", () => {
    expect(canonicalize("Postgres")).toBe("postgresql");
    expect(canonicalize("psql")).toBe("postgresql");
    expect(canonicalize("PostgreSQL")).toBe("postgresql");
  });

  it("maps JS variants to javascript", () => {
    expect(canonicalize("JS")).toBe("javascript");
    expect(canonicalize("ECMAScript")).toBe("javascript");
  });

  it("maps TS to typescript", () => {
    expect(canonicalize("TS")).toBe("typescript");
  });

  it("maps k8s to kubernetes", () => {
    expect(canonicalize("k8s")).toBe("kubernetes");
  });

  it("maps AWS to amazon web services", () => {
    expect(canonicalize("AWS")).toBe("amazon web services");
  });

  it("returns normalized form for unknown terms", () => {
    expect(canonicalize("SomeUnknownTool")).toBe("someunknowntool");
  });

  it("handles React.js → react → canonical react", () => {
    expect(canonicalize("React.js")).toBe("react");
  });

  it("handles Node.js → node → canonical node.js", () => {
    expect(canonicalize("Node.js")).toBe("node.js");
    expect(canonicalize("NodeJS")).toBe("node.js");
    expect(canonicalize("Node")).toBe("node.js");
  });
});

describe("expandSynonyms", () => {
  it("expands postgres to all aliases", () => {
    const expanded = expandSynonyms("Postgres");
    expect(expanded).toContain("postgresql");
    expect(expanded).toContain("postgres");
    expect(expanded).toContain("psql");
    expect(expanded).toContain("pg");
  });

  it("expands React to include react.js and reactjs", () => {
    const expanded = expandSynonyms("React");
    expect(expanded).toContain("react");
    expect(expanded).toContain("react.js");
    expect(expanded).toContain("reactjs");
  });

  it("returns single-element array for unknown term", () => {
    const expanded = expandSynonyms("Foobar");
    expect(expanded).toEqual(["foobar"]);
  });

  it("handles CI/CD variants", () => {
    const expanded = expandSynonyms("CI/CD");
    expect(expanded).toContain("ci/cd");
    expect(expanded).toContain("continuous integration");
    expect(expanded).toContain("cicd");
  });
});

describe("matchesNormalized", () => {
  const haystack = "experienced with react, node.js, postgresql, and aws. built ci/cd pipelines with kubernetes.";

  it("matches exact term", () => {
    expect(matchesNormalized(haystack, "React")).toBe(true);
  });

  it("matches via synonym: Postgres → postgresql in text", () => {
    expect(matchesNormalized(haystack, "Postgres")).toBe(true);
  });

  it("matches via synonym: k8s → kubernetes in text", () => {
    expect(matchesNormalized(haystack, "k8s")).toBe(true);
  });

  it("matches via synonym: Amazon Web Services → aws in text", () => {
    expect(matchesNormalized(haystack, "Amazon Web Services")).toBe(true);
  });

  it("matches via synonym: continuous integration → ci/cd in text", () => {
    expect(matchesNormalized(haystack, "continuous integration")).toBe(true);
  });

  it("matches Node.js when text has node.js", () => {
    expect(matchesNormalized(haystack, "NodeJS")).toBe(true);
  });

  it("does NOT match an absent term", () => {
    expect(matchesNormalized(haystack, "Django")).toBe(false);
  });

  it("handles C++ (special regex chars) without crashing", () => {
    const text = "proficient in c++ and c#";
    expect(matchesNormalized(text, "C++")).toBe(true);
    expect(matchesNormalized(text, "C#")).toBe(true);
    expect(matchesNormalized(text, "cpp")).toBe(true);
    expect(matchesNormalized(text, "csharp")).toBe(true);
  });

  it("does NOT match partial word for single-word terms", () => {
    const text = "interactive design and collaboration";
    expect(matchesNormalized(text, "React")).toBe(false); // "react" not in "interactive"
  });

  it("matches multi-word terms as substring", () => {
    const text = "used machine learning for prediction models";
    expect(matchesNormalized(text, "ML")).toBe(true); // synonym of machine learning
    expect(matchesNormalized(text, "machine learning")).toBe(true);
  });
});
