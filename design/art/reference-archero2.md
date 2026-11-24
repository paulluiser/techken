# Art reference: Archero 2 (style direction, not a template)

Reference studied: the official App Store listing for Archero 2 (Habby), 2026-11-24.
Store page: https://apps.apple.com/ca/app/archero-2/id6502820653
Screenshots were viewed in the browser only. No images are saved in this repo, and none
may be traced, copied or shipped.

The goal is the same *production feel* (premium mobile stylized 3D) applied to Techken's
own characters, arenas and UI. A player should never mistake a Techken screen for theirs.

## What we take

| Area | What we take from the reference | How it lands in Techken |
|---|---|---|
| Proportions | Super-deformed chibi, about 2 to 2.5 heads tall, stubby limbs, oversized hands and feet | Same proportions for all 17 jobs; silhouettes still differ by hair, prop and outfit |
| Faces | Large dark eyes with one big highlight and one small one, soft blush, small mouth | Same rule; expressions change per pose (charge, guard, hurt, Burnout) |
| Shading | Smooth soft 3D shading, no ink outlines, gentle warm key light and a coloured rim light | Rim colour comes from the job's palette, so each fighter glows in its own colour |
| Environments | Chunky beveled blocks, bright and readable floors, clean play space | Office-themed blocks: carpet tiles, cubicle walls, server racks, floating desks |
| VFX | Skill effects are the loudest thing on screen: additive gold/cyan bursts, sparkles, light trails | Effects themed per job: keycaps and code glyphs for SE, data rings for DBA |
| UI | Chunky beveled frames, gold trim, rarity colour coding, ribbon banners, heavy rounded display type with dark outline | Our sets, items and buffs get the rarity colours; layout and ornaments are our own |
| Menus | Characters displayed on lit pedestals with aura effects | The Employee Directory becomes an "office awards" stage |

## What we avoid

- Their characters, costumes, creatures, logo, icons or any recognisable layout.
- Fantasy medieval motifs (arrows, crowns, angel wings, castles). Our world is a tech office.
- Their exact UI frames and card shapes. We use squarer "ID badge" and "sticky note" shapes.
- Portrait top-down camera. Techken stays landscape and side-on, with the camera raised
  about 25 degrees so arenas read as dioramas.

## Rarity colours (Techken's own)

Matches the item rarities in GAME_DESIGN.md section 4.

| Rarity / use | Colour | Used for |
|---|---|---|
| Common | Slate #8a97b8 | Coffee, Pizza Friday, Energy Drink, Calendar Invite |
| Rare | Cyan #3fb8ff | Rubber Duck, Stack Overflow Answer, Mechanical Keyboard and the other Rare items |
| Epic | Gold #ffc63a | PTO, Promotion |
| Kit sets | Violet #a86bff | Set A / Set B cards on the kit pick screen |

## Technical notes

- three.js renderer over the existing deterministic sim. The sim, netcode and hitboxes don't change.
- Characters are low-poly models (about 3 to 6k triangles) with a skeletal rig and soft gradient textures.
- sRGB output with ACES tone mapping. Bloom only on VFX layers.
- The sample in `dev/styles/archero-direction.html` is built from primitives in code. It shows the
  direction, not final model quality.
