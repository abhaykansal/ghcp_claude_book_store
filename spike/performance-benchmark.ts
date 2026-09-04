/**
 * Performance Benchmark Spike (Task T2.1)
 * Validates the <200ms p95 search requirement using the real
 * ExcelPersistence + SearchEngine implementation with generated data.
 *
 * Usage: npx ts-node spike/performance-benchmark.ts
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { ExcelPersistence } from '../src/persistence/ExcelPersistence';
import { SearchEngine } from '../src/services/SearchEngine';

const DATASET_SIZES = [100, 500, 1000];
const REQUESTS_PER_SIZE = 30;
const BENCH_FILE = path.join(__dirname, 'benchmark-books.xlsx');

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function seedBooks(persistence: ExcelPersistence, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await persistence.addBook(
      `Benchmark Book ${i} - The Great Gatsby Edition ${i}`,
      `Benchmark Author ${i % 50}`,
      `978-BENCH-${i}`
    );
  }
}

async function run(): Promise<void> {
  const results: Record<number, { p50: number; p95: number; p99: number }> = {};

  for (const size of DATASET_SIZES) {
    if (fs.existsSync(BENCH_FILE)) {
      fs.unlinkSync(BENCH_FILE);
    }

    const persistence = new ExcelPersistence(BENCH_FILE);
    const searchEngine = new SearchEngine();

    await seedBooks(persistence, size);

    const durations: number[] = [];
    for (let i = 0; i < REQUESTS_PER_SIZE; i++) {
      const start = performance.now();
      const books = await persistence.getAllBooks();
      searchEngine.searchByTitle('Gatsby', books);
      const end = performance.now();
      durations.push(end - start);
    }

    durations.sort((a, b) => a - b);
    results[size] = {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    };

    console.log(`Dataset size ${size}: p50=${results[size].p50.toFixed(2)}ms p95=${results[size].p95.toFixed(2)}ms p99=${results[size].p99.toFixed(2)}ms`);
  }

  if (fs.existsSync(BENCH_FILE)) {
    fs.unlinkSync(BENCH_FILE);
  }

  const p95Values = Object.values(results).map((r) => r.p95);
  const maxP95 = Math.max(...p95Values);
  console.log(`\nMax p95 across all dataset sizes: ${maxP95.toFixed(2)}ms`);
  console.log(maxP95 < 200 ? 'PASS: <200ms p95 requirement met' : 'FAIL: p95 exceeds 200ms');
}

run().catch((err) => {
  console.error('Benchmark failed', err);
  process.exitCode = 1;
});
