# Turndown Fast performance

Turndown Fast is a source-level fork based on Turndown v7.2.4. It preserves the
public API and changes sibling-output assembly, blank-node descendant checks,
and Markdown escaping.

## Large, table-heavy article

This benchmark uses a 3.21 MB HTML article with many table rows. Both builds use
`new TurndownService().turndown(html)` with default options, so the measurements
cover the library itself rather than an application-specific conversion pipeline.

Three fresh processes per implementation ran in alternating order. Each process
performed one warm-up and two measured conversions; garbage collection ran before
each measured conversion. Times below summarize six measurements per version.

| Metric | Stock Turndown 7.2.4 | Turndown Fast |
|---|---:|---:|
| Conversion time, median of 6 | 15,486.0 ms | 153.8 ms |
| Conversion time, observed range | 15,248.1–16,355.2 ms | 144.2–160.1 ms |
| Peak process RSS, median of 3 | 479.8 MiB | 234.4 MiB |
| Post-GC RSS, median of 3 | 225.8 MiB | 214.0 MiB |
| Output bytes | 1,822,047 | 1,822,047 |
| Output parity | Exact | Exact |

That is about **100.7× faster on this particular large article**; it is not a
package-wide speed guarantee. Node's peak-RSS measurements agreed with an
independent operating-system measurement in these runs.

## Diverse 50-page HTML corpus

The broader benchmark uses 50 HTML pages (38.24 MB total) across table-heavy,
dense-tree, list, and small/medium/large control categories. Stock and fork were
compared directly with default Turndown options and no application-specific
processing. Each version ran in three fresh processes with alternating order,
one warm-up, and one measured conversion per page per process. Reported page times
are medians across processes; weighted speedup is based on the sum of page
medians, while geometric and median speedups summarize per-page ratios.

| Aggregate | Result |
|---|---:|
| Exact output parity | 50/50 pages |
| Sum of per-page median times, stock | 3,317.4 ms |
| Sum of per-page median times, Turndown Fast | 2,345.6 ms |
| Weighted speedup | 1.414× |
| Geometric-mean page speedup | 1.225× |
| Median page speedup | 1.142× |
| Faster / slower pages | 41 / 9 |

Representative category medians:

| Page category | Input size | Stock | Turndown Fast | Speedup |
|---|---:|---:|---:|---:|
| Table-heavy | 199 KB | 79.9 ms | 29.8 ms | 2.68× |
| Dense tree | 403 KB | 105.4 ms | 52.5 ms | 2.01× |
| List-heavy | 673 KB | 167.7 ms | 93.6 ms | 1.79× |
| Small control | 4.7 KB | 0.278 ms | 0.283 ms | 0.98× |
| Medium control | 119 KB | 13.5 ms | 10.3 ms | 1.30× |
| Large control | 1.5 MB | 93.4 ms | 66.8 ms | 1.40× |

Small control pages regress as a category (0.940× weighted); the overall corpus
gain is therefore workload-dependent rather than uniform.

| Peak process RSS, median of 3 | Stock Turndown 7.2.4 | Turndown Fast |
|---|---:|---:|
| Across corpus workers | 316.0 MiB | 293.6 MiB |

## Validation and environment

| Check | Result |
|---|---:|
| Directed conversions, join-edge cases, article and corpus samples | 18/18 exact |
| Upstream internals tests | 19/19 passed |
| Upstream conversion tests | 1,030/1,030 passed |
| Build and test build | Passed |
| Lint | Passed; three existing `no-var` warnings |

Measurements used Node.js v26.8.2 on Linux x64. These benchmarks cover the
combined fork on two finite input sets; they do not isolate the contribution of
each optimization or guarantee the same speedup for other workloads.
