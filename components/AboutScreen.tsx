import Link from 'next/link'
import { lines } from '@/lib/lines'
import styles from './AboutScreen.module.css'

// What RWR is, what the AI does, and where its ideas come from. The four circles are credited
// to the people who drew them, and ikigai is described as its own thing, not as this game.
export default function AboutScreen() {
  return (
    <main className="screen">
      <div className="screen-inner">
        <h1 className={styles.heading}>{lines.about.heading}</h1>

        {lines.about.sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.subheading}>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section className={styles.section}>
          <h2 className={styles.subheading}>{lines.about.sourcesHeading}</h2>
          <ul className={styles.sources}>
            {lines.about.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/">
            {lines.about.back}
          </Link>{' '}
          <Link className="btn btn-quiet" href="/privacy">
            {lines.about.toPrivacy}
          </Link>
        </p>

        <p className={styles.credit}>
          <a href={lines.about.creditUrl} target="_blank" rel="noopener noreferrer">
            {lines.about.credit}
          </a>
        </p>
      </div>
    </main>
  )
}
