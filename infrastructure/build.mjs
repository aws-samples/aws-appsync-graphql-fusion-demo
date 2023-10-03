/* eslint-disable */
import { build } from 'esbuild'
import {glob} from 'glob'

for (const microServiceName of ['authorsService', 'booksService']) {
    // Build resolver code for authors service
    const files_agent = await glob(`lib/sourceApis/${microServiceName}/resolverCode/**/*.ts`)
    console.log(`Building ${files_agent.length} files from ${microServiceName}`)

    await build({
        sourcesContent: false,
        format: 'esm',
        target: 'esnext',
        platform: 'node',
        external: ['@aws-appsync/utils'],
        outdir: `lib/sourceApis/${microServiceName}/resolverCode`,
        entryPoints: files_agent,
        bundle: true,
    })
}