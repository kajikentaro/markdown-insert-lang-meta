import { readFileSync, writeFileSync } from "fs";
import highlight from "highlight.js";
import Input from "./input";

// if relevance is under DENY_MAX_THRESHOULD, do nothing
const SKIP_MAX_THRESHOULD = 4;
// if relevance is under ONDEMAND_MAX_THRESHOULD, asking user
const ONDEMAND_MAX_THRESHOULD = 10;

const LANGUAGES = [
  "bash",
  "c",
  "cmake",
  "cpp",
  "csp",
  "css",
  "markdown",
  "diff",
  "dockerfile",
  "ruby",
  "go",
  "ini",
  "java",
  "javascript",
  "json",
  "php",
  "protobuf",
  "python",
  "scss",
  "shell",
  "sql",
  "yaml",
  "vim",
  "wasm",
  "xml",
];

if (require.main === module) {
  const input = new Input();
  main({ argv: process.argv, input })
    .then()
    .catch((e) => console.error(e));
}

interface MainOptions {
  argv: string[];
  input: Input;
}

async function main(options: MainOptions) {
  const fileNames = options.argv.slice(2, options.argv.length);
  if (fileNames.length === 0) {
    throw new Error(
      "files are not specified. usage: node [this script] [...files]"
    );
  }
  for (const fileName of fileNames) {
    const text = readFileSync(fileName).toString().replace(/\r\n/g, "\n");
    const lines = text.split("\n");
    const codeBlocks = getCodeBlocks(text);
    for (const codeBlock of codeBlocks) {
      const codeRes = highlight.highlightAuto(codeBlock.str, LANGUAGES);
      if (!codeRes.language) continue;

      if (codeRes.relevance <= SKIP_MAX_THRESHOULD) continue;
      if (codeRes.relevance < ONDEMAND_MAX_THRESHOULD) {
        console.log("\n\n\n########## CODE BLOCK IS HERE ##########");
        console.log(codeBlock.str);
        console.log("########## CODE BLOCK IS HERE ##########\n\n");

        let ansUser = "";
        while (ansUser === "") {
          ansUser = await options.input.line(
            `Is this ${codeRes.language}? y/n/[or language name]: `
          );
        }
        if (ansUser === "n") continue;
        let language = "";
        if (ansUser === "y") language = codeRes.language;
        else language = ansUser;

        lines[codeBlock.startDelimiterLine] = lines[
          codeBlock.startDelimiterLine
        ].replace("```", "```" + language);
        continue;
      }
      lines[codeBlock.startDelimiterLine] = lines[
        codeBlock.startDelimiterLine
      ].replace("```", "```" + codeRes.language);
    }
    writeFileSync(fileName, lines.join("\n"));
  }
}

interface CodeBlock {
  str: string;
  startDelimiterLine: number;
}

function getCodeBlocks(text: string): CodeBlock[] {
  const lines = text.split("\n");
  const codeBlocks: CodeBlock[] = [];
  let isInCodeBlock = false;

  let codeStr: string[] = []; // this is splited by \n
  let startDelimiterLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/```/)) {
      if (isInCodeBlock) {
        // found end ```
        isInCodeBlock = false;
        if (startDelimiterLine === -1) continue;
        codeBlocks.push({ str: codeStr.join("\n"), startDelimiterLine });
        continue;
      } else {
        // found start ```
        isInCodeBlock = true;
        startDelimiterLine = i;
        codeStr = [];
        if (!line.match(/```$/)) {
          // if already defined lang. eg) found ```cpp
          startDelimiterLine = -1;
        }
        continue;
      }
    }
    if (isInCodeBlock) {
      codeStr.push(line);
    }
  }
  return codeBlocks;
}
