# Attribution

The hamster, wheel, avatars, interface icons, social illustration and match-card drawing are original source included in this project. No visual assets or interface layout were copied from squeekchain.com. Public API schemas were inspected solely to integrate the named data sources.

## Runtime dependencies

- React and React DOM 19.2.0: MIT; https://github.com/facebook/react
- lossless-json 4.3.0: MIT; https://github.com/josdejong/lossless-json

Exact dependency and tool versions, integrity hashes and transitive licenses are preserved in `package-lock.json` and the packages installed by `npm ci`. Vite is MIT; TypeScript is Apache-2.0. Test-only tools include Playwright and axe. Installed dependencies and browser downloads are not vendored in this repository.

## Local fonts

DM Sans and Space Grotesk were obtained from Google Fonts. Each remains licensed under the SIL Open Font License 1.1:

- [DM Sans OFL](public/fonts/DM-Sans-OFL.txt)
- [Space Grotesk OFL](public/fonts/Space-Grotesk-OFL.txt)

The WOFF2 files and license notices are included in both `public/fonts/` and the production export’s `fonts/` directory.

## Design guidance

The implementation and review used the supplied pinned Better Interface and design-critic references. Better Interface design guidance: Jakub Krehel, MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`, https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface.

Design-documentation guidance: Paul Bakaus, Impeccable, Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md.

Both supplied license texts and copyright notices are retained in [artifacts/design-guidance-LICENSE.txt](artifacts/design-guidance-LICENSE.txt). This acknowledges the distinct guidance works; it does not relicense either upstream project.
