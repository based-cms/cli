import { defineCMSSection, z } from '@based-cms/client'

export const heroSection = defineCMSSection({
  name: 'hero',
  label: 'Hero Section',
  fields: {
    heading: z.string().label('Heading'),
    subheading: z.string().optional().label('Subheading'),
    image: z.image().label('Background Image'),
    ctaText: z.string().optional().label('CTA Button Text'),
    ctaLink: z.string().optional().label('CTA Link'),
  },
})

export const blogSection = defineCMSSection({
  name: 'blog_post',
  label: 'Blog Posts',
  // publishable: items carry a draft/published toggle in the CMS editor —
  // new items start as drafts, and public reads (getSection/useSection)
  // return published items only. Items saved before a section became
  // publishable count as published.
  publishable: true,
  fields: {
    title: z.string().label('Title'),
    // Slugified on blur in the editor, unique within the section — pair
    // with a /blog/[slug] route for detail pages.
    slug: z.slug().label('Slug'),
    // Markdown (headings/bold/lists/links); raw HTML is stripped on save.
    // Render with the markdown component of your choice.
    body: z.string().richText().label('Body'),
    publishedOn: z.date().optional().label('Published On'),
  },
})

export const teamSection = defineCMSSection({
  name: 'team',
  label: 'Team Members',
  fields: {
    name: z.string().label('Full Name'),
    role: z.string().label('Role'),
    bio: z.string().optional().multiline().label('Bio'),
    image: z.image().label('Photo'),
    order: z.number().default(0).label('Sort Order'),
  },
})
