import { describe, it, expect } from 'vitest'
import { parseDiff, getChangedLines } from '../parser.js'

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/index.ts
@@ -0,0 +1,3 @@
+const x = 1
+const y = 2
+const z = 3`

describe('parseDiff', () => {
  it('parses a simple addition diff', () => {
    const files = parseDiff(SAMPLE_DIFF)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('src/index.ts')
    expect(files[0].status).toBe('added')
    expect(files[0].additions).toBe(3)
    expect(files[0].deletions).toBe(0)
  })

  it('returns empty array for empty string', () => {
    expect(parseDiff('')).toEqual([])
  })

  it('parses multiple files', () => {
    const diff = `diff --git a/a.ts b/a.ts
index 000..111
--- a/a.ts
+++ b/a.ts
@@ -1 +1,2 @@
-old
+new
+another
diff --git a/b.ts b/b.ts
index 222..333
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
-old
+new`

    const files = parseDiff(diff)
    expect(files).toHaveLength(2)
    expect(files[0].path).toBe('a.ts')
    expect(files[1].path).toBe('b.ts')
  })

  it('parses a deletion diff', () => {
    const diff = `diff --git a/gone.ts b/gone.ts
deleted file mode 100644
index 111..000
--- a/gone.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-line1
-line2`

    const files = parseDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('gone.ts')
    expect(files[0].status).toBe('deleted')
    expect(files[0].deletions).toBe(2)
  })

  it('parses a rename diff', () => {
    const diff = `diff --git a/old.ts b/new.ts
rename from old.ts
rename to new.ts`

    const files = parseDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('new.ts')
    expect(files[0].status).toBe('renamed')
    expect(files[0].oldPath).toBe('old.ts')
  })

  it('parses hunks with correct line numbers', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 111..222
--- a/file.ts
+++ b/file.ts
@@ -10,3 +10,4 @@
 context
-removed
+added
 context`

    const files = parseDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].hunks).toHaveLength(1)

    const hunk = files[0].hunks[0]
    expect(hunk.oldStart).toBe(10)
    expect(hunk.newStart).toBe(10)
    expect(hunk.lines).toHaveLength(4)

    expect(hunk.lines[0].type).toBe('context')
    expect(hunk.lines[0].oldLineNo).toBe(10)
    expect(hunk.lines[0].newLineNo).toBe(10)

    expect(hunk.lines[1].type).toBe('removed')
    expect(hunk.lines[1].oldLineNo).toBe(11)

    expect(hunk.lines[2].type).toBe('added')
    expect(hunk.lines[2].newLineNo).toBe(11)
  })

  it('handles multiple hunks in one file', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 111..222
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 a
 b
 c
+d
@@ -20,3 +21,2 @@
 x
 y
-z`

    const files = parseDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].hunks).toHaveLength(2)
  })

  it('returns correct additions and deletions counts', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 111..222
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,4 @@
 keep
-remove1
-remove2
+add1
+add2
 keep`

    const files = parseDiff(diff)
    expect(files[0].additions).toBe(2)
    expect(files[0].deletions).toBe(2)
  })
})

describe('getChangedLines', () => {
  it('returns a map of added line numbers to content', () => {
    const files = parseDiff(SAMPLE_DIFF)
    const lines = getChangedLines(files[0])
    expect(lines.size).toBe(3)
    expect(lines.get(1)).toBe('const x = 1')
    expect(lines.get(2)).toBe('const y = 2')
    expect(lines.get(3)).toBe('const z = 3')
  })

  it('returns empty map for a deletion-only diff', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 111..000
--- a/file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-gone
-bye`
    const files = parseDiff(diff)
    const lines = getChangedLines(files[0])
    expect(lines.size).toBe(0)
  })
})
