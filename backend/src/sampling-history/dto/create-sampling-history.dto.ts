export class CreateSamplingHistoryDto {
  timestamp: string;
  sampleSize: number;
  seed: string;
  fileHash: string;
  resultHash: string;
  canonicalResultHash?: string;
  method: string;
}
