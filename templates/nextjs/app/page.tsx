'use client'

import { useSection } from 'cms-client/react'
import { heroSection, teamSection } from '@/lib/sections'

export default function Home() {
  const hero = useSection(heroSection)
  const team = useSection(teamSection)

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      {/* Hero section */}
      {hero === undefined ? (
        <p>Loading hero...</p>
      ) : hero.length === 0 ? (
        <section style={{ textAlign: 'center', padding: '4rem 0' }}>
          <h1>Welcome</h1>
          <p style={{ color: '#666' }}>
            Add hero content in the CMS dashboard to get started.
          </p>
        </section>
      ) : (
        hero.map((item, i) => (
          <section
            key={i}
            style={{
              textAlign: 'center',
              padding: '4rem 0',
              backgroundImage: item.image ? `url(${item.image})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <h1>{item.heading}</h1>
            {item.subheading && <p>{item.subheading}</p>}
            {item.ctaText && item.ctaLink && (
              <a
                href={item.ctaLink}
                style={{
                  display: 'inline-block',
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: '#000',
                  color: '#fff',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                {item.ctaText}
              </a>
            )}
          </section>
        ))
      )}

      {/* Team section */}
      <section style={{ padding: '2rem 0' }}>
        <h2>Team</h2>
        {team === undefined ? (
          <p>Loading team...</p>
        ) : team.length === 0 ? (
          <p style={{ color: '#666' }}>
            Add team members in the CMS dashboard.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginTop: '1rem',
            }}
          >
            {[...team]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((member, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: '1rem',
                    textAlign: 'center',
                  }}
                >
                  {member.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.image}
                      alt={member.name}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        margin: '0 auto 0.5rem',
                      }}
                    />
                  )}
                  <h3 style={{ margin: 0 }}>{member.name}</h3>
                  <p style={{ margin: '0.25rem 0', color: '#666', fontSize: 14 }}>
                    {member.role}
                  </p>
                  {member.bio && (
                    <p style={{ fontSize: 13, color: '#888' }}>{member.bio}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  )
}
