import { defineCMSSection, z } from 'cms-client'

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
