import { scanFiles, getFilePathSet } from '../src/server/scanner.js'
import { loadPathAliases, resolveImport, type ResolverConfig } from '../src/server/resolver.js'
import { DEFAULT_CONFIG } from '../src/shared/types.js'

const rootDir = 'c:/Users/Matt-PC/Documents/App Development/ThothOS-production'

async function main() {
  // Scan files
  const files = await scanFiles(rootDir, DEFAULT_CONFIG.include, DEFAULT_CONFIG.exclude)
  console.log('Total scanned files:', files.size)

  // Show a sample file's imports
  const sampleKey = [...files.keys()].find(k => k.includes('dashboard/administration/workspace/accounting/page'))
  if (sampleKey) {
    const sample = files.get(sampleKey)!
    console.log('\nSample file:', sampleKey)
    console.log('Imports:', JSON.stringify(sample.imports, null, 2))
  } else {
    console.log('\nCould not find sample accounting page')
    // Show first 5 files
    console.log('First 5 files:')
    let i = 0
    for (const [path, file] of files) {
      if (i++ >= 5) break
      console.log(' ', path, '→', file.imports.length, 'imports')
    }
  }

  // Check path aliases
  const aliases = await loadPathAliases(rootDir)
  console.log('\nPath aliases:', JSON.stringify(aliases, null, 2))

  // Check known files
  const knownFiles = getFilePathSet(files)
  console.log('\nKnown files count:', knownFiles.size)

  // Sample a few known files
  const sampleKnown = [...knownFiles].slice(0, 3)
  console.log('Sample known:', sampleKnown)

  // Try resolving a specific import
  if (sampleKey) {
    const sample = files.get(sampleKey)!
    const config: ResolverConfig = { rootDir, pathAliases: aliases, knownFiles }

    for (const imp of sample.imports.slice(0, 5)) {
      const resolved = resolveImport(imp.specifier, sampleKey, config)
      console.log(`\nResolve '${imp.specifier}' from ${sampleKey.split('/').pop()}:`)
      console.log('  →', resolved)
    }
  }

  // Check if a known file exists in the set
  const testPath = rootDir + '/src/lib/auth.ts'
  console.log('\nDoes auth.ts exist in knownFiles?', knownFiles.has(testPath))
  // Try with the actual keys
  const authKey = [...knownFiles].find(k => k.includes('lib/auth'))
  console.log('Actual auth path in set:', authKey)
}

main().catch(console.error)
