import { z } from 'zod'

const HttpUrlSchema = z
  .url('URL must be a valid absolute URL')
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  })

export const WebFetchInputSchema = z.object({
  url: HttpUrlSchema.describe('The URL to fetch content from'),
  timeout: z.number().int().positive().max(120).optional().describe('Optional timeout in seconds (max 120)'),
})

const WebFetchBaseOutputSchema = z.object({
  url: z.url(),
  status: z.number().int().nonnegative(),
  mime: z.string().min(1),
  contentLength: z.number().int().nonnegative(),
})

export const WebFetchContentOutputSchema = WebFetchBaseOutputSchema.extend({
  kind: z.literal('content'),
  format: z.literal('markdown'),
  content: z.string(),
  truncated: z.boolean(),
})

export const WebFetchBinaryOutputSchema = WebFetchBaseOutputSchema.extend({
  kind: z.literal('binary'),
  isImage: z.boolean(),
  summary: z.string(),
})

export const WebFetchOutputSchema = z.discriminatedUnion('kind', [
  WebFetchContentOutputSchema,
  WebFetchBinaryOutputSchema,
])

export type WebFetchInput = z.infer<typeof WebFetchInputSchema>
export type WebFetchContentOutput = z.infer<typeof WebFetchContentOutputSchema>
export type WebFetchBinaryOutput = z.infer<typeof WebFetchBinaryOutputSchema>
export type WebFetchOutput = z.infer<typeof WebFetchOutputSchema>
