export { canonicalizeUrl } from './url-canonicalizer';
export {
  titleSimilarity,
  normalizeTitle,
  generateTrigrams,
  cosineSimilarity,
  DEDUPE_THRESHOLD,
  CLUSTER_THRESHOLD,
} from './title-similarity';
export { deduplicateCandidates, buildClusters } from './cluster';
