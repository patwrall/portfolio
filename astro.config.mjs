// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import fs from "fs";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config

const earlGreyTheme = JSON.parse(
  fs.readFileSync("./earl-grey-theme.json", "utf-8"),
);

export default defineConfig({
  // TODO: update to your production domain before deploying
  site: 'https://patrickrall.com',

  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      shikiConfig: {
        theme: earlGreyTheme,
      },
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  ],

  adapter: cloudflare()
});