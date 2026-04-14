import { defineCollection, z } from "astro:content";

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string(),
    draft: z.boolean().optional(),
    videos: z.array(z.string()).optional(),
  }),
});

export const collections = { blog: blogCollection };
