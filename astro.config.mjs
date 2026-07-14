// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import fs from "fs";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config

const earlGreyTheme = JSON.parse(
  fs.readFileSync("./earl-grey-theme.json", "utf-8"),
);

const cudaQualifiers = new Set([
  "__global__",
  "__device__",
  "__host__",
  "__shared__",
  "__constant__",
  "__forceinline__",
  "__noinline__",
  "__restrict__",
  "__launch_bounds__",
]);

const cudaQualifierTransformer = {
  name: "cuda-qualifiers",
  tokens(lines) {
    for (const line of lines) {
      for (const token of line) {
        if (cudaQualifiers.has(token.content.trim())) {
          token.color = "#3B3D41";
          token.fontStyle = 2;
        }
      }
    }
    return lines;
  },
};

export default defineConfig({
  // TODO: update to your production domain before deploying
  site: 'https://patrickrall.com',

  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      shikiConfig: {
        theme: earlGreyTheme,
        transformers: [cudaQualifierTransformer],
      },
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeKatex,
        [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
      ],
    }),
  ],

  adapter: cloudflare()
});
