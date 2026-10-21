import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

const require = createRequire(import.meta.url);
const pkgDir = dirname(fileURLToPath(import.meta.url));

const selfPkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8')) as {
  version: string;
};

// external judgement for library mode: only externalize bare specifiers
// (deps / peers / workspace packages); keep relative and in-project absolute
// paths inside the bundle.
//
// Do NOT copy the CONVENTIONS 3.1 template expression
//   `!id.startsWith('.') && !id.startsWith('/') && !id.startsWith('virtual:')`
// On Windows it is broken: Vite calls this callback a second time with the
// already-resolved ABSOLUTE path (e.g. D:/.../src/x.tsx), which starts with
// neither '.' nor '/'. Those local modules then get wrongly marked external,
// the bundle keeps dangling imports to non-existent ./x.tsx, and none of the
// 34 less/scss files emit CSS (measured: only 2 modules transformed).
// Here we explicitly exclude drive-letter and UNC absolute paths.
//
// Vite 8 is oxc-based. Legacy decorators (mixed-setter uses MobX
// @observer/@obx.ref/@computed) inject @oxc-project/runtime/helpers/decorate.
// That helper is inlined by Vite's built-in oxcRuntimePlugin as a virtual
// module and is NOT a real dependency to externalize (it is not installed).
// So we keep it internal to avoid emitting an unresolvable bare import.
function isBare(id: string) {
  if (id.startsWith('.') || id.startsWith('virtual:') || id.startsWith('\0')) return false;
  if (id.startsWith('/')) return false;
  if (/^[a-zA-Z]:[\\/]/.test(id)) return false;
  if (id.startsWith('\\\\')) return false;
  if (id.startsWith('@oxc-project/runtime')) return false;
  return !isAbsolute(id);
}

// Emit the Fusion theme (@alifd/theme-lowcode-light) prebuilt CSS into
// dist/fusion.css.
//
// Background: the old build stack used build-plugin-fusion (theme variable
// injection) + build-plugin-fusion-css (bundle the CSS of the Fusion
// components actually used), so dist/css/engine-ext.css already carried Fusion
// styles. Under Vite lib mode @alifd/next is external (and a peerDependency),
// so Fusion CSS does not come in with the JS. We therefore emit one optional
// theme CSS file, semantically equal to the old artifact but without polluting
// the main CSS bundle:
//   - dist/index.css  -> only this repo's own 34 less/scss (incl. .next-* overrides)
//   - dist/fusion.css -> variables.css + dist/next.var.min.css, optional import
// Hosts that already load the theme via CDN (all current demos do) can skip it.
function emitFusionCss(): Plugin {
  const THEME = '@alifd/theme-lowcode-light';
  const parts = ['variables.css', 'dist/next.var.min.css'];

  return {
    name: 'engine-ext:emit-fusion-css',
    apply: 'build',
    closeBundle() {
      let themeDir: string;
      try {
        themeDir = dirname(require.resolve(`${THEME}/package.json`));
      } catch {
        this.warn(
          `${THEME} not installed; skipping dist/fusion.css (index.css and JS are unaffected)`,
        );
        return;
      }

      const chunks: string[] = [];
      for (const part of parts) {
        const file = join(themeDir, part);
        if (!existsSync(file)) {
          this.warn(`${THEME}/${part} missing; skipped that chunk`);
          continue;
        }
        chunks.push(`/* ${THEME}/${part} */\n${readFileSync(file, 'utf-8')}`);
      }

      if (!chunks.length) return;
      const outDir = join(pkgDir, 'dist');
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'fusion.css'), chunks.join('\n'));
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
    emitFusionCss(),
  ],
  define: {
    // Replaces the old `import packagesInfo from '../package.json'`: that JSON
    // lives outside src/, so vite-plugin-dts would treat it as outside
    // entryRoot and emit its declaration beyond dist.
    __ENGINE_EXT_VERSION__: JSON.stringify(selfPkg.version),
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.mjs' : 'index.cjs'),
      cssFileName: 'index',
    },
    rollupOptions: {
      external: isBare,
    },
    // Collect all 34 less/scss into a single dist/index.css; consumers import once.
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
