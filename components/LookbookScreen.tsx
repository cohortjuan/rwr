import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import { accessories, categories, wornToken, type Accessory } from '@/lib/accessories'
import { lines } from '@/lib/lines'
import styles from './LookbookScreen.module.css'

type ItemId = keyof typeof lines.wardrobe.items
type ColourId = keyof typeof lines.wardrobe.colours

const itemName = (item: Accessory) => lines.wardrobe.items[item.id as ItemId] ?? item.id
const colourName = (id: string) => lines.wardrobe.colours[id as ColourId] ?? id
const maneLevels = [1, 2, 3]

function cost(item: Accessory): string {
  if (item.gift) return lines.wardrobe.gifts[item.gift]
  return item.price === 0 ? lines.wardrobe.free : lines.wardrobe.price(item.price)
}

// Every piece in the wardrobe, in every colour, drawn from the same catalogue the game uses.
// A page to look through, with nothing to buy or change.
export default function LookbookScreen() {
  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.lookbook.heading}</h1>
          <p className={styles.intro}>{lines.lookbook.intro}</p>
        </header>

        {categories.map((category) => (
          <section key={category} className={styles.group}>
            <h2 className={styles.subheading}>{lines.wardrobe.categories[category]}</h2>
            {accessories
              .filter((item) => item.category === category)
              .map((item) => (
                <div key={item.id} className={styles.piece}>
                  <p className={styles.pieceName}>
                    {itemName(item)} <span className={styles.cost}>{cost(item)}</span>
                  </p>
                  <ul className={styles.tiles}>
                    {/* A mane colour is shown at each size the mane grows through. */}
                    {category === 'mane' &&
                      maneLevels.map((level) => (
                        <li key={level}>
                          <LionAvatar className={styles.lion} wearing={[item.id]} mane={level} />
                          <span>{lines.lookbook.maneLevel(level)}</span>
                        </li>
                      ))}
                    {category !== 'mane' &&
                      (item.variants ?? [undefined]).map((variant) => (
                        <li key={variant?.id ?? item.id}>
                          <LionAvatar className={styles.lion} wearing={[wornToken(item, variant?.id)]} />
                          {variant && <span>{colourName(variant.id)}</span>}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </section>
        ))}

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/wardrobe">
            {lines.lookbook.back}
          </Link>
        </p>
      </div>
    </main>
  )
}
