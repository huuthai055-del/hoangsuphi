import { randomFillSync } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import { SharpImageProcessor } from '../repository/sharp-image-processor';
import { MediaValidationPolicy } from '../service/media-validation.policy';

interface Scenario {
  name: string;
  input: Buffer;
}

interface ScenarioResult {
  name: string;
  inputBytes: number;
  inputDimensions: { width: number | null; height: number | null };
  validationDurationMs: number;
  processingDurationMs: number;
  storageBoundaryDurationMs: number;
  totalDurationMs: number;
  observedRssDeltaBytes: number;
  outputBytes: number;
  outputReductionPercent: number;
  variants: Array<{ name: string; width: number; height: number; bytes: number }>;
}

const processor = new SharpImageProcessor();

async function solidJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 34, g: 92, b: 48 },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function nearLimitJpeg(): Promise<Buffer> {
  const width = 4800;
  const height = 1500;
  const raw = Buffer.allocUnsafe(width * height * 3);
  randomFillSync(raw);
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 100 })
    .toBuffer();
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const rssBefore = process.memoryUsage.rss();
  const totalStartedAt = performance.now();

  const validationStartedAt = performance.now();
  MediaValidationPolicy.determineMediaTypeAndLimit('image/jpeg', scenario.input.length);
  MediaValidationPolicy.validateImageMagicBytes(scenario.input, 'image/jpeg');
  const sourceMetadata = await processor.extractMetadata(scenario.input);
  const validationDurationMs = performance.now() - validationStartedAt;

  const processingStartedAt = performance.now();
  const specs = [
    {
      name: 'master',
      width: sourceMetadata.width ?? 1,
      height: sourceMetadata.height ?? 1,
      quality: 85,
    },
    { name: 'thumbnail', width: 320, height: 320, quality: 80 },
    { name: 'medium', width: 768, height: 768, quality: 80 },
    { name: 'large', width: 1600, height: 1600, quality: 80 },
  ] as const;
  const outputs: Array<{ name: string; buffer: Buffer; width: number; height: number }> = [];
  for (const spec of specs) {
    const output = await processor.resize(scenario.input, spec.width, spec.height, spec.quality);
    const metadata = await sharp(output.buffer).metadata();
    outputs.push({
      name: spec.name,
      buffer: output.buffer,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    });
  }
  const processingDurationMs = performance.now() - processingStartedAt;

  // Measures bounded, sequential buffer hand-off cost only. It is intentionally
  // not reported as Cloudinary network latency.
  const storageStartedAt = performance.now();
  const inMemorySink = new Map<string, Buffer>();
  for (const output of outputs) {
    inMemorySink.set(output.name, Buffer.from(output.buffer));
  }
  const storageBoundaryDurationMs = performance.now() - storageStartedAt;

  const outputBytes = outputs.reduce((sum, output) => sum + output.buffer.length, 0);
  const totalDurationMs = performance.now() - totalStartedAt;
  const rssAfter = process.memoryUsage.rss();

  return {
    name: scenario.name,
    inputBytes: scenario.input.length,
    inputDimensions: {
      width: sourceMetadata.width ?? null,
      height: sourceMetadata.height ?? null,
    },
    validationDurationMs,
    processingDurationMs,
    storageBoundaryDurationMs,
    totalDurationMs,
    observedRssDeltaBytes: rssAfter - rssBefore,
    outputBytes,
    outputReductionPercent: (1 - outputBytes / scenario.input.length) * 100,
    variants: outputs.map((output) => ({
      name: output.name,
      width: output.width,
      height: output.height,
      bytes: output.buffer.length,
    })),
  };
}

const scenarios: Scenario[] = [
  { name: 'small-640x480', input: await solidJpeg(640, 480) },
  { name: 'medium-1920x1080', input: await solidJpeg(1920, 1080) },
  { name: 'near-10mb-4800x1500', input: await nearLimitJpeg() },
  { name: 'high-resolution-6200x6200', input: await solidJpeg(6200, 6200) },
];

const results: ScenarioResult[] = [];
for (const scenario of scenarios) {
  results.push(await runScenario(scenario));
}

console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      runtime: { bun: Bun.version, platform: process.platform, arch: process.arch },
      note: 'Storage timing is in-memory boundary cost; Cloudinary network timing is reported separately.',
      results,
    },
    null,
    2
  )
);
